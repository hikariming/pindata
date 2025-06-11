#!/usr/bin/env python3
"""
数据库迁移管理器

支持版本化的数据库迁移，确保老版本可以平滑升级到新版本
"""
import os
import sys
import hashlib
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import ProgrammingError
import importlib.util

class MigrationManager:
    """数据库迁移管理器"""
    
    def __init__(self, database_url: str, migrations_dir: str = None):
        self.database_url = database_url
        self.engine = create_engine(database_url)
        
        # 设置迁移文件目录
        if migrations_dir is None:
            migrations_dir = os.path.dirname(os.path.abspath(__file__))
        self.migrations_dir = migrations_dir
        
        self.migrations_table = 'schema_migrations'
        
    def init_migrations_table(self):
        """初始化迁移记录表"""
        try:
            with self.engine.connect() as conn:
                # 创建迁移记录表
                conn.execute(text(f"""
                    CREATE TABLE IF NOT EXISTS {self.migrations_table} (
                        id SERIAL PRIMARY KEY,
                        version VARCHAR(255) UNIQUE NOT NULL,
                        filename VARCHAR(255) NOT NULL,
                        checksum VARCHAR(64) NOT NULL,
                        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        execution_time_ms INTEGER,
                        status VARCHAR(20) DEFAULT 'SUCCESS',
                        error_message TEXT
                    )
                """))
                
                # 创建索引
                conn.execute(text(f"""
                    CREATE INDEX IF NOT EXISTS idx_migrations_version 
                    ON {self.migrations_table} (version)
                """))
                
                conn.commit()
                print(f"迁移记录表 {self.migrations_table} 初始化完成")
                
        except Exception as e:
            print(f"初始化迁移记录表失败: {e}")
            raise
    
    def get_current_schema_version(self) -> Optional[str]:
        """获取当前数据库schema版本"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(f"""
                    SELECT version FROM {self.migrations_table} 
                    WHERE status = 'SUCCESS' 
                    ORDER BY executed_at DESC 
                    LIMIT 1
                """))
                row = result.fetchone()
                return row[0] if row else None
        except ProgrammingError:
            # 迁移表不存在，说明是全新数据库
            return None
        except Exception as e:
            print(f"获取当前版本失败: {e}")
            return None
    
    def scan_migration_files(self) -> List[Dict[str, Any]]:
        """扫描迁移文件"""
        migrations = []
        
        for filename in sorted(os.listdir(self.migrations_dir)):
            if filename.endswith('_migration.py') and filename.startswith('v'):
                filepath = os.path.join(self.migrations_dir, filename)
                
                # 从文件名提取版本号 (v1.0.0_create_users_migration.py -> v1.0.0)
                version = filename.split('_')[0]
                
                # 计算文件校验和
                with open(filepath, 'rb') as f:
                    checksum = hashlib.sha256(f.read()).hexdigest()
                
                migrations.append({
                    'version': version,
                    'filename': filename,
                    'filepath': filepath,
                    'checksum': checksum
                })
        
        return migrations
    
    def get_executed_migrations(self) -> List[Dict[str, Any]]:
        """获取已执行的迁移"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text(f"""
                    SELECT version, filename, checksum, executed_at, status
                    FROM {self.migrations_table}
                    ORDER BY executed_at
                """))
                
                return [
                    {
                        'version': row[0],
                        'filename': row[1],
                        'checksum': row[2],
                        'executed_at': row[3],
                        'status': row[4]
                    }
                    for row in result.fetchall()
                ]
        except ProgrammingError:
            return []
    
    def get_pending_migrations(self) -> List[Dict[str, Any]]:
        """获取待执行的迁移"""
        all_migrations = self.scan_migration_files()
        executed_migrations = self.get_executed_migrations()
        
        executed_versions = {m['version'] for m in executed_migrations}
        
        pending = []
        for migration in all_migrations:
            if migration['version'] not in executed_versions:
                pending.append(migration)
        
        return pending
    
    def load_migration_module(self, filepath: str):
        """动态加载迁移模块"""
        spec = importlib.util.spec_from_file_location("migration", filepath)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    
    def execute_migration(self, migration: Dict[str, Any]) -> bool:
        """执行单个迁移"""
        print(f"执行迁移: {migration['version']} - {migration['filename']}")
        
        start_time = datetime.now()
        
        try:
            # 加载迁移模块
            module = self.load_migration_module(migration['filepath'])
            
            # 检查必需的函数
            if not hasattr(module, 'up'):
                raise Exception("迁移文件必须包含 up() 函数")
            
            # 执行迁移
            with self.engine.connect() as conn:
                # 开始事务
                trans = conn.begin()
                try:
                    # 执行up函数
                    module.up(conn)
                    
                    # 记录迁移执行
                    execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
                    
                    conn.execute(text(f"""
                        INSERT INTO {self.migrations_table} 
                        (version, filename, checksum, execution_time_ms, status)
                        VALUES (:version, :filename, :checksum, :execution_time, 'SUCCESS')
                    """), {
                        'version': migration['version'],
                        'filename': migration['filename'],
                        'checksum': migration['checksum'],
                        'execution_time': execution_time
                    })
                    
                    trans.commit()
                    print(f"✅ 迁移 {migration['version']} 执行成功 ({execution_time}ms)")
                    return True
                    
                except Exception as e:
                    trans.rollback()
                    raise e
                    
        except Exception as e:
            execution_time = int((datetime.now() - start_time).total_seconds() * 1000)
            error_msg = str(e)
            
            # 记录失败的迁移
            try:
                with self.engine.connect() as conn:
                    conn.execute(text(f"""
                        INSERT INTO {self.migrations_table} 
                        (version, filename, checksum, execution_time_ms, status, error_message)
                        VALUES (:version, :filename, :checksum, :execution_time, 'FAILED', :error_message)
                    """), {
                        'version': migration['version'],
                        'filename': migration['filename'],
                        'checksum': migration['checksum'],
                        'execution_time': execution_time,
                        'error_message': error_msg
                    })
                    conn.commit()
            except:
                pass
            
            print(f"❌ 迁移 {migration['version']} 执行失败: {error_msg}")
            return False
    
    def rollback_migration(self, migration: Dict[str, Any]) -> bool:
        """回滚单个迁移"""
        print(f"回滚迁移: {migration['version']} - {migration['filename']}")
        
        try:
            # 加载迁移模块
            module = self.load_migration_module(migration['filepath'])
            
            # 检查是否有down函数
            if not hasattr(module, 'down'):
                print(f"⚠️  迁移 {migration['version']} 没有down()函数，无法回滚")
                return False
            
            # 执行回滚
            with self.engine.connect() as conn:
                trans = conn.begin()
                try:
                    # 执行down函数
                    module.down(conn)
                    
                    # 删除迁移记录
                    conn.execute(text(f"""
                        DELETE FROM {self.migrations_table}
                        WHERE version = :version
                    """), {'version': migration['version']})
                    
                    trans.commit()
                    print(f"✅ 迁移 {migration['version']} 回滚成功")
                    return True
                    
                except Exception as e:
                    trans.rollback()
                    raise e
                    
        except Exception as e:
            print(f"❌ 迁移 {migration['version']} 回滚失败: {e}")
            return False
    
    def migrate(self, target_version: str = None) -> bool:
        """执行迁移到目标版本"""
        # 初始化迁移表
        self.init_migrations_table()
        
        # 获取待执行的迁移
        pending_migrations = self.get_pending_migrations()
        
        if not pending_migrations:
            print("✅ 没有待执行的迁移")
            return True
        
        # 如果指定了目标版本，过滤迁移
        if target_version:
            pending_migrations = [
                m for m in pending_migrations 
                if self.compare_versions(m['version'], target_version) <= 0
            ]
        
        if not pending_migrations:
            print("✅ 没有需要执行的迁移")
            return True
        
        print(f"发现 {len(pending_migrations)} 个待执行的迁移:")
        for migration in pending_migrations:
            print(f"  - {migration['version']}: {migration['filename']}")
        
        # 执行迁移
        for migration in pending_migrations:
            if not self.execute_migration(migration):
                print(f"❌ 迁移在 {migration['version']} 处停止")
                return False
        
        print("✅ 所有迁移执行完成")
        return True
    
    def status(self):
        """显示迁移状态"""
        print("=== 数据库迁移状态 ===")
        
        current_version = self.get_current_schema_version()
        print(f"当前版本: {current_version or '未知'}")
        
        all_migrations = self.scan_migration_files()
        executed_migrations = {m['version']: m for m in self.get_executed_migrations()}
        
        print("\n迁移列表:")
        for migration in all_migrations:
            version = migration['version']
            if version in executed_migrations:
                status = "✅ 已执行"
                exec_info = executed_migrations[version]
                if exec_info['status'] == 'FAILED':
                    status = "❌ 失败"
            else:
                status = "⏳ 待执行"
            
            print(f"  {version:<10} {status:<10} {migration['filename']}")
    
    def compare_versions(self, version1: str, version2: str) -> int:
        """比较版本号 (返回 -1, 0, 1)"""
        # 简单的版本比较，假设格式为 v1.2.3
        def parse_version(v):
            return tuple(map(int, v.lstrip('v').split('.')))
        
        v1 = parse_version(version1)
        v2 = parse_version(version2)
        
        if v1 < v2:
            return -1
        elif v1 > v2:
            return 1
        else:
            return 0
    
    def detect_current_schema(self) -> str:
        """检测当前数据库schema状态，生成相应的版本信息"""
        inspector = inspect(self.engine)
        tables = inspector.get_table_names()
        
        schema_info = {
            'tables': sorted(tables),
            'has_users_table': 'users' in tables,
            'has_auth_system': all(t in tables for t in ['users', 'roles', 'permissions']),
            'has_migration_table': self.migrations_table in tables
        }
        
        print("当前数据库schema检测结果:")
        print(f"  - 表总数: {len(tables)}")
        print(f"  - 用户表: {'✅' if schema_info['has_users_table'] else '❌'}")
        print(f"  - 认证系统: {'✅' if schema_info['has_auth_system'] else '❌'}")
        print(f"  - 迁移表: {'✅' if schema_info['has_migration_table'] else '❌'}")
        
        return schema_info


def main():
    """命令行工具"""
    import argparse
    
    parser = argparse.ArgumentParser(description='数据库迁移管理工具')
    parser.add_argument('--database-url', default='postgresql://postgres:password@localhost:5432/pindata_dataset',
                       help='数据库连接URL')
    parser.add_argument('command', choices=['status', 'migrate', 'rollback', 'detect'],
                       help='要执行的命令')
    parser.add_argument('--target', help='目标版本')
    
    args = parser.parse_args()
    
    manager = MigrationManager(args.database_url)
    
    if args.command == 'status':
        manager.status()
    elif args.command == 'migrate':
        success = manager.migrate(args.target)
        sys.exit(0 if success else 1)
    elif args.command == 'detect':
        manager.detect_current_schema()
    elif args.command == 'rollback':
        print("回滚功能开发中...")
    
    
if __name__ == '__main__':
    main()