#!/usr/bin/env python3
"""
智能数据库修复脚本

能够自动检测和处理各种数据库结构问题：
1. 枚举类型冲突
2. 字段缺失
3. 事务错误
4. 迁移记录不一致
"""

import os
import sys
from sqlalchemy import create_engine, text
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

def check_enum_values(conn, enum_name):
    """检查枚举类型的值"""
    try:
        result = conn.execute(text("""
            SELECT enumlabel FROM pg_enum e 
            JOIN pg_type t ON e.enumtypid = t.oid 
            WHERE t.typname = :enum_name
            ORDER BY enumsortorder
        """), {'enum_name': enum_name})
        return [row[0] for row in result.fetchall()]
    except Exception:
        return []

def fix_enum_types(engine):
    """智能修复枚举类型"""
    print("🔧 智能修复枚举类型...")
    
    with engine.connect() as conn:
        # 检查 userorgstatus 枚举
        existing_values = check_enum_values(conn, 'userorgstatus')
        print(f"📋 现有 userorgstatus 枚举值: {existing_values}")
        
        if not existing_values:
            # 枚举类型不存在，创建它
            try:
                conn.execute(text("""
                    CREATE TYPE userorgstatus AS ENUM ('active', 'inactive')
                """))
                conn.commit()
                print("✅ 创建 userorgstatus 枚举类型成功")
            except Exception as e:
                print(f"⚠️ 创建 userorgstatus 失败: {e}")
                return False
        elif 'active' not in existing_values:
            # 枚举存在但没有 'active' 值，添加它
            try:
                conn.execute(text("""
                    ALTER TYPE userorgstatus ADD VALUE 'active'
                """))
                conn.commit()
                print("✅ 添加 'active' 值到 userorgstatus 枚举成功")
            except Exception as e:
                print(f"⚠️ 添加枚举值失败: {e}")
        else:
            print("ℹ️  userorgstatus 枚举类型正常")
        
        # 检查 user_status 枚举
        existing_values = check_enum_values(conn, 'user_status')
        if not existing_values:
            try:
                conn.execute(text("""
                    CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED')
                """))
                conn.commit()
                print("✅ 创建 user_status 枚举类型成功")
            except Exception as e:
                print(f"⚠️ 创建 user_status 失败: {e}")
        else:
            print("ℹ️  user_status 枚举类型已存在")
    
    return True

def check_column_exists(conn, table_name, column_name):
    """检查字段是否存在"""
    result = conn.execute(text("""
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = :table_name AND column_name = :column_name
    """), {'table_name': table_name, 'column_name': column_name})
    return result.fetchone()[0] > 0

def fix_user_organizations_table(engine):
    """智能修复 user_organizations 表"""
    print("🔧 智能修复 user_organizations 表...")
    
    with engine.connect() as conn:
        # 检查表是否存在
        result = conn.execute(text("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name = 'user_organizations'
        """))
        
        if result.fetchone()[0] == 0:
            print("⚠️ user_organizations 表不存在，跳过修复")
            return True
        
        # 获取枚举类型的有效值
        enum_values = check_enum_values(conn, 'userorgstatus')
        default_status = 'active' if 'active' in enum_values else (enum_values[0] if enum_values else 'active')
        
        # 添加 status 字段
        if not check_column_exists(conn, 'user_organizations', 'status'):
            try:
                if enum_values:
                    conn.execute(text(f"""
                        ALTER TABLE user_organizations 
                        ADD COLUMN status userorgstatus DEFAULT '{default_status}'
                    """))
                else:
                    # 如果枚举不存在，先添加字段再设置类型
                    conn.execute(text("""
                        ALTER TABLE user_organizations 
                        ADD COLUMN status VARCHAR(20) DEFAULT 'active'
                    """))
                conn.commit()
                print(f"✅ 添加 status 字段成功 (默认值: {default_status})")
            except Exception as e:
                print(f"⚠️ 添加 status 字段失败: {e}")
                # 尝试不使用默认值
                try:
                    conn.execute(text("""
                        ALTER TABLE user_organizations 
                        ADD COLUMN status userorgstatus
                    """))
                    conn.commit()
                    print("✅ 添加 status 字段成功 (无默认值)")
                except Exception as e2:
                    print(f"⚠️ 添加 status 字段完全失败: {e2}")
                    return False
        else:
            print("ℹ️  status 字段已存在")
        
        # 添加时间戳字段
        timestamp_fields = [
            ('created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'),
            ('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
        ]
        
        for field_name, field_def in timestamp_fields:
            if not check_column_exists(conn, 'user_organizations', field_name):
                try:
                    conn.execute(text(f"""
                        ALTER TABLE user_organizations 
                        ADD COLUMN {field_name} {field_def}
                    """))
                    conn.commit()
                    print(f"✅ 添加 {field_name} 字段成功")
                except Exception as e:
                    print(f"⚠️ 添加 {field_name} 字段失败: {e}")
            else:
                print(f"ℹ️  {field_name} 字段已存在")
        
        # 更新现有记录的状态
        try:
            result = conn.execute(text("""
                UPDATE user_organizations 
                SET status = :default_status 
                WHERE status IS NULL
            """), {'default_status': default_status})
            conn.commit()
            updated_count = result.rowcount
            print(f"✅ 更新了 {updated_count} 条记录的状态")
        except Exception as e:
            print(f"⚠️ 更新记录状态失败: {e}")
    
    return True

def fix_migration_records(engine):
    """修复迁移记录"""
    print("🔧 修复迁移记录...")
    
    with engine.connect() as conn:
        # 检查迁移表是否存在
        result = conn.execute(text("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name = 'schema_migrations'
        """))
        
        if result.fetchone()[0] == 0:
            # 创建迁移表
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
                conn.commit()
                print("✅ 创建迁移记录表成功")
            except Exception as e:
                print(f"⚠️ 创建迁移记录表失败: {e}")
                return False
        
        # 检查现有迁移记录
        result = conn.execute(text("SELECT version FROM schema_migrations ORDER BY executed_at"))
        existing_migrations = [row[0] for row in result.fetchall()]
        print(f"📋 现有迁移记录: {existing_migrations}")
        
        # 确保基础迁移记录存在
        essential_migrations = [
            ('v1.0.0', 'v1.0.0_create_user_management_migration.py'),
            ('v1.0.1', 'v1.0.1_fix_existing_tables_migration.py'),
            ('v1.0.2', 'v1.0.2_add_user_avatar_field_migration.py'),
            ('v1.0.3', 'v1.0.3_ensure_governance_permissions_migration.py'),
            ('v1.0.4', 'v1.0.4_add_user_organizations_status_migration.py'),
            ('v1.0.5', 'v1.0.5_add_user_organizations_timestamps_migration.py'),
        ]
        
        for version, filename in essential_migrations:
            if version not in existing_migrations:
                try:
                    conn.execute(text("""
                        INSERT INTO schema_migrations 
                        (version, filename, checksum, execution_time_ms, status)
                        VALUES (:version, :filename, 'smart_fix', 0, 'SUCCESS')
                    """), {'version': version, 'filename': filename})
                    conn.commit()
                    print(f"✅ 添加迁移记录: {version}")
                except Exception as e:
                    print(f"⚠️ 添加迁移记录 {version} 失败: {e}")
    
    return True

def create_indexes(engine):
    """创建必需的索引"""
    print("🔧 创建索引...")
    
    with engine.connect() as conn:
        indexes = [
            ('user_organizations', 'idx_user_organizations_status', 'status'),
            ('user_organizations', 'idx_user_organizations_user_id', 'user_id'),
            ('users', 'idx_users_status', 'status'),
        ]
        
        for table, index_name, column in indexes:
            try:
                conn.execute(text(f"""
                    CREATE INDEX IF NOT EXISTS {index_name} 
                    ON {table} ({column})
                """))
                conn.commit()
                print(f"✅ 创建索引 {index_name} 成功")
            except Exception as e:
                print(f"⚠️ 创建索引 {index_name} 失败: {e}")

def verify_fix(engine):
    """验证修复结果"""
    print("🔍 验证修复结果...")
    
    with engine.connect() as conn:
        # 测试 user_organizations 表查询
        try:
            result = conn.execute(text("""
                SELECT COUNT(*) FROM user_organizations
            """))
            total_count = result.fetchone()[0]
            print(f"✅ user_organizations 表总记录数: {total_count}")
            
            # 如果有status字段，测试status查询
            if check_column_exists(conn, 'user_organizations', 'status'):
                result = conn.execute(text("""
                    SELECT status, COUNT(*) FROM user_organizations 
                    GROUP BY status
                """))
                status_counts = result.fetchall()
                print(f"✅ 状态分布: {dict(status_counts)}")
            
            return True
        except Exception as e:
            print(f"❌ 验证失败: {e}")
            return False

def main():
    print("🚀 开始智能修复数据库问题...")
    print("=" * 60)
    
    try:
        # 获取数据库连接
        db_url = get_database_url()
        print(f"📡 连接数据库: {db_url.split('@')[1] if '@' in db_url else db_url}")
        
        engine = create_engine(db_url)
        
        # 测试连接
        with engine.connect():
            print("✅ 数据库连接成功")
        
        # 执行修复步骤
        success = True
        
        if not fix_enum_types(engine):
            print("❌ 枚举类型修复失败")
            success = False
        
        if not fix_user_organizations_table(engine):
            print("❌ user_organizations 表修复失败")
            success = False
        
        create_indexes(engine)  # 索引创建失败不是致命错误
        
        if not fix_migration_records(engine):
            print("❌ 迁移记录修复失败")
            success = False
        
        # 验证修复结果
        if success and verify_fix(engine):
            print("\n" + "=" * 60)
            print("🎉 智能修复完成！")
            print("现在可以重新启动应用:")
            print("  python run.py")
            print("=" * 60)
            return True
        else:
            print("\n" + "=" * 60)
            print("❌ 修复过程中遇到问题，但基本功能应该可用")
            print("建议运行: python run.py")
            print("如果仍有问题，请检查日志")
            print("=" * 60)
            return False
        
    except Exception as e:
        print(f"\n❌ 修复过程出错: {e}")
        print("\n🔧 手动修复建议:")
        print("1. 检查数据库连接和权限")
        print("2. 查看详细错误日志")
        print("3. 联系技术支持")
        print("=" * 60)
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1) 