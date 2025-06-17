#!/usr/bin/env python3
"""
数据库同步脚本

用于快速修复大版本更新后的数据库结构问题。
可以独立运行，不依赖迁移系统。

使用方法:
    python sync_database.py --check          # 检查数据库状态
    python sync_database.py --sync           # 同步数据库结构
    python sync_database.py --force          # 强制同步（跳过确认）
"""

import os
import sys
import argparse
from sqlalchemy import create_engine, text, inspect
from datetime import datetime

def get_database_url():
    """获取数据库连接URL"""
    # 从环境变量获取
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        return db_url
    
    # 从.env文件读取
    env_file = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    return line.split('=', 1)[1].strip()
    
    # 默认值
    return 'postgresql://postgres:password@localhost:5432/pindata_dataset'

def check_database_status(engine):
    """检查数据库状态"""
    print("=== 数据库状态检查 ===")
    
    with engine.connect() as conn:
        inspector = inspect(conn)
        
        # 检查表存在性
        tables = inspector.get_table_names()
        
        required_tables = [
            'users', 'organizations', 'user_organizations', 'user_roles',
            'roles', 'permissions', 'datasets', 'schema_migrations'
        ]
        
        print("\n📋 表存在性检查:")
        for table in required_tables:
            status = "✅ 存在" if table in tables else "❌ 缺失"
            print(f"  {table}: {status}")
        
        # 检查关键字段
        print("\n🔍 关键字段检查:")
        
        if 'user_organizations' in tables:
            columns = {col['name']: col for col in inspector.get_columns('user_organizations')}
            status_exists = "✅ 存在" if 'status' in columns else "❌ 缺失"
            print(f"  user_organizations.status: {status_exists}")
            
            created_at_exists = "✅ 存在" if 'created_at' in columns else "❌ 缺失"
            print(f"  user_organizations.created_at: {created_at_exists}")
            
            updated_at_exists = "✅ 存在" if 'updated_at' in columns else "❌ 缺失"
            print(f"  user_organizations.updated_at: {updated_at_exists}")
        
        # 检查枚举类型
        print("\n📊 枚举类型检查:")
        try:
            result = conn.execute(text("""
                SELECT typname FROM pg_type 
                WHERE typtype = 'e' 
                AND typname IN ('user_status', 'userorgstatus', 'userrolestatus', 'organizationstatus')
                ORDER BY typname
            """))
            
            existing_enums = [row[0] for row in result.fetchall()]
            required_enums = ['user_status', 'userorgstatus', 'userrolestatus', 'organizationstatus']
            
            for enum_name in required_enums:
                status = "✅ 存在" if enum_name in existing_enums else "❌ 缺失"
                print(f"  {enum_name}: {status}")
        except Exception as e:
            print(f"  枚举类型检查失败: {e}")
        
        # 检查迁移记录
        print("\n📝 迁移记录检查:")
        if 'schema_migrations' in tables:
            try:
                result = conn.execute(text("SELECT COUNT(*) FROM schema_migrations"))
                count = result.fetchone()[0]
                print(f"  已执行迁移数量: {count}")
                
                if count > 0:
                    result = conn.execute(text("""
                        SELECT version FROM schema_migrations 
                        WHERE status = 'SUCCESS' 
                        ORDER BY executed_at DESC 
                        LIMIT 1
                    """))
                    latest = result.fetchone()
                    if latest:
                        print(f"  最新迁移版本: {latest[0]}")
            except Exception as e:
                print(f"  迁移记录查询失败: {e}")
        else:
            print("  ❌ 迁移记录表不存在")

def sync_database_structure(engine, force=False):
    """同步数据库结构"""
    print("=== 数据库结构同步 ===")
    
    if not force:
        confirm = input("⚠️  即将修改数据库结构，是否继续? (y/N): ")
        if confirm.lower() not in ['y', 'yes']:
            print("操作已取消")
            return False
    
    with engine.connect() as conn:
        # 开始事务
        trans = conn.begin()
        
        try:
            inspector = inspect(conn)
            
            # 1. 创建枚举类型
            print("\n1️⃣ 创建枚举类型...")
            create_enum_types(conn)
            
            # 2. 修复 user_organizations 表
            print("\n2️⃣ 修复 user_organizations 表...")
            fix_user_organizations_table(conn, inspector)
            
            # 3. 修复其他表
            print("\n3️⃣ 修复其他系统表...")
            fix_other_tables(conn, inspector)
            
            # 4. 创建索引
            print("\n4️⃣ 创建必需索引...")
            create_indexes(conn)
            
            # 5. 创建迁移记录表
            print("\n5️⃣ 确保迁移记录表存在...")
            ensure_migration_table(conn, inspector)
            
            # 提交事务
            trans.commit()
            print("\n✅ 数据库结构同步完成!")
            return True
            
        except Exception as e:
            trans.rollback()
            print(f"\n❌ 同步失败: {e}")
            return False

def create_enum_types(conn):
    """创建枚举类型"""
    enums = [
        ("user_status", ['ACTIVE', 'INACTIVE', 'SUSPENDED']),
        ("userorgstatus", ['active', 'inactive']),
        ("userrolestatus", ['ACTIVE', 'INACTIVE']),
        ("organizationstatus", ['ACTIVE', 'INACTIVE'])
    ]
    
    for enum_name, values in enums:
        try:
            values_str = "', '".join(values)
            conn.execute(text(f"""
                DO $$ BEGIN
                    CREATE TYPE {enum_name} AS ENUM ('{values_str}');
                    RAISE NOTICE '枚举类型 {enum_name} 创建成功';
                EXCEPTION
                    WHEN duplicate_object THEN 
                        RAISE NOTICE '枚举类型 {enum_name} 已存在，跳过创建';
                END $$;
            """))
            print(f"  ✅ {enum_name}")
        except Exception as e:
            print(f"  ⚠️ {enum_name}: {e}")

def fix_user_organizations_table(conn, inspector):
    """修复 user_organizations 表"""
    if 'user_organizations' not in inspector.get_table_names():
        print("  ⚠️ user_organizations 表不存在，跳过修复")
        return
    
    columns = {col['name']: col for col in inspector.get_columns('user_organizations')}
    
    # 添加缺失字段
    fields_to_add = [
        ('status', 'userorgstatus DEFAULT \'active\''),
        ('created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'),
        ('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
    ]
    
    for field_name, field_def in fields_to_add:
        if field_name not in columns:
            try:
                conn.execute(text(f"""
                    ALTER TABLE user_organizations 
                    ADD COLUMN {field_name} {field_def}
                """))
                print(f"  ✅ 添加字段: {field_name}")
            except Exception as e:
                print(f"  ⚠️ 字段 {field_name} 添加失败: {e}")
        else:
            print(f"  ℹ️ 字段已存在: {field_name}")
    
    # 更新现有记录的状态
    if 'status' not in columns:
        try:
            conn.execute(text("""
                UPDATE user_organizations 
                SET status = 'active' 
                WHERE status IS NULL
            """))
            print("  ✅ 现有记录状态已更新")
        except Exception as e:
            print(f"  ⚠️ 状态更新失败: {e}")

def fix_other_tables(conn, inspector):
    """修复其他表"""
    tables = inspector.get_table_names()
    
    # 修复 users 表
    if 'users' in tables:
        columns = {col['name']: col for col in inspector.get_columns('users')}
        user_fields = [
            ('avatar_url', 'TEXT'),
            ('status', 'user_status DEFAULT \'ACTIVE\''),
            ('last_login_at', 'TIMESTAMP'),
        ]
        
        for field_name, field_def in user_fields:
            if field_name not in columns:
                try:
                    conn.execute(text(f"""
                        ALTER TABLE users 
                        ADD COLUMN {field_name} {field_def}
                    """))
                    print(f"  ✅ users.{field_name} 已添加")
                except Exception as e:
                    print(f"  ⚠️ users.{field_name} 添加失败: {e}")
    
    # 修复 datasets 表
    if 'datasets' in tables:
        dataset_fields = [
            ('dataset_type', 'VARCHAR(50)'),
            ('status', 'VARCHAR(50) DEFAULT \'pending\''),
            ('file_path', 'VARCHAR(500)'),
            ('meta_data', 'JSONB')
        ]
        
        for field_name, field_def in dataset_fields:
            try:
                conn.execute(text(f"""
                    ALTER TABLE datasets 
                    ADD COLUMN IF NOT EXISTS {field_name} {field_def}
                """))
            except Exception as e:
                print(f"  ⚠️ datasets.{field_name} 添加失败: {e}")

def create_indexes(conn):
    """创建必需索引"""
    indexes = [
        ('user_organizations', 'idx_user_organizations_status', 'status'),
        ('users', 'idx_users_status', 'status'),
        ('datasets', 'idx_datasets_status', 'status'),
    ]
    
    for table, index_name, column in indexes:
        try:
            conn.execute(text(f"""
                CREATE INDEX IF NOT EXISTS {index_name} 
                ON {table} ({column})
            """))
            print(f"  ✅ 索引 {index_name}")
        except Exception as e:
            print(f"  ⚠️ 索引 {index_name}: {e}")

def ensure_migration_table(conn, inspector):
    """确保迁移记录表存在"""
    if 'schema_migrations' not in inspector.get_table_names():
        try:
            conn.execute(text("""
                CREATE TABLE schema_migrations (
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
            print("  ✅ 迁移记录表已创建")
        except Exception as e:
            print(f"  ⚠️ 迁移记录表创建失败: {e}")

def main():
    parser = argparse.ArgumentParser(description='数据库同步工具')
    parser.add_argument('--check', action='store_true', help='检查数据库状态')
    parser.add_argument('--sync', action='store_true', help='同步数据库结构')
    parser.add_argument('--force', action='store_true', help='强制同步（跳过确认）')
    parser.add_argument('--database-url', help='数据库连接URL')
    
    args = parser.parse_args()
    
    # 获取数据库URL
    db_url = args.database_url or get_database_url()
    
    try:
        engine = create_engine(db_url)
        
        if args.check:
            check_database_status(engine)
        elif args.sync:
            success = sync_database_structure(engine, args.force)
            sys.exit(0 if success else 1)
        else:
            print("请指定操作: --check 或 --sync")
            parser.print_help()
            
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 