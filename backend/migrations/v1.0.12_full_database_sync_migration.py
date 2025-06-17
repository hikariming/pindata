#!/usr/bin/env python3
"""
v1.0.12 完整数据库同步迁移

这个迁移脚本用于处理大版本更新后的数据库同步问题。
它会检查并修复所有缺失的表结构，确保数据库与当前代码模型完全匹配。

适用场景：
- 从老版本升级到新版本后数据库结构不匹配
- 手动创建的表需要同步到迁移管理系统
- 迁移记录缺失需要重建
"""

from sqlalchemy import text, inspect
from datetime import datetime
import uuid

MIGRATION_VERSION = "v1.0.12"
MIGRATION_DESCRIPTION = "完整数据库同步迁移 - 修复大版本更新后的结构不匹配问题"
MIGRATION_AUTHOR = "系统"
MIGRATION_DATE = datetime.now().isoformat()

def up(conn):
    """执行完整数据库同步"""
    print(f"执行迁移: {MIGRATION_DESCRIPTION}")
    print("开始完整数据库同步...")
    
    # 获取数据库检查器
    inspector = inspect(conn)
    
    # 1. 确保迁移记录表存在
    ensure_migration_table(conn, inspector)
    
    # 2. 检查并修复用户管理系统表
    fix_user_management_tables(conn, inspector)
    
    # 3. 检查并修复组织相关表
    fix_organization_tables(conn, inspector)
    
    # 4. 检查并修复其他系统表
    fix_other_system_tables(conn, inspector)
    
    # 5. 确保所有必需的索引存在
    ensure_required_indexes(conn, inspector)
    
    # 6. 更新迁移记录（标记历史迁移为已执行）
    sync_migration_records(conn)
    
    print("✅ 完整数据库同步完成")

def ensure_migration_table(conn, inspector):
    """确保迁移记录表存在"""
    print("检查迁移记录表...")
    
    if 'schema_migrations' not in inspector.get_table_names():
        print("创建迁移记录表...")
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
        
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_migrations_version 
            ON schema_migrations (version)
        """))
        print("✅ 迁移记录表创建完成")
    else:
        print("✅ 迁移记录表已存在")

def fix_user_management_tables(conn, inspector):
    """修复用户管理系统相关表"""
    print("检查用户管理系统表...")
    
    # 创建必需的枚举类型
    print("确保枚举类型存在...")
    enums_to_create = [
        ("user_status", ['ACTIVE', 'INACTIVE', 'SUSPENDED']),
        ("userorgstatus", ['active', 'inactive']),
        ("userrolestatus", ['ACTIVE', 'INACTIVE']),
        ("organizationstatus", ['ACTIVE', 'INACTIVE'])
    ]
    
    for enum_name, values in enums_to_create:
        try:
            values_str = "', '".join(values)
            conn.execute(text(f"""
                DO $$ BEGIN
                    CREATE TYPE {enum_name} AS ENUM ('{values_str}');
                EXCEPTION
                    WHEN duplicate_object THEN 
                        RAISE NOTICE '{enum_name}枚举类型已存在，跳过创建';
                END $$;
            """))
        except Exception as e:
            print(f"枚举类型 {enum_name} 处理: {e}")
    
    # 检查并修复 user_organizations 表
    fix_user_organizations_table(conn, inspector)
    
    # 检查并修复其他用户相关表
    fix_users_table(conn, inspector)
    fix_organizations_table(conn, inspector)
    fix_user_roles_table(conn, inspector)

def fix_user_organizations_table(conn, inspector):
    """修复 user_organizations 表"""
    print("检查 user_organizations 表...")
    
    if 'user_organizations' in inspector.get_table_names():
        columns = {col['name']: col for col in inspector.get_columns('user_organizations')}
        
        # 检查并添加缺失的字段
        missing_columns = []
        
        if 'status' not in columns:
            missing_columns.append(('status', 'userorgstatus DEFAULT \'active\''))
        
        if 'created_at' not in columns:
            missing_columns.append(('created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'))
        
        if 'updated_at' not in columns:
            missing_columns.append(('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'))
        
        # 添加缺失字段
        for col_name, col_def in missing_columns:
            print(f"添加字段 user_organizations.{col_name}...")
            try:
                conn.execute(text(f"""
                    ALTER TABLE user_organizations 
                    ADD COLUMN IF NOT EXISTS {col_name} {col_def}
                """))
                print(f"✅ 字段 {col_name} 添加成功")
            except Exception as e:
                print(f"⚠️ 字段 {col_name} 添加失败: {e}")
        
        # 更新现有记录的状态字段
        if 'status' in [col[0] for col in missing_columns]:
            print("更新现有记录的status值...")
            try:
                conn.execute(text("""
                    UPDATE user_organizations 
                    SET status = 'active' 
                    WHERE status IS NULL
                """))
                print("✅ 现有记录状态更新完成")
            except Exception as e:
                print(f"⚠️ 状态更新失败: {e}")
    
    else:
        print("⚠️ user_organizations 表不存在，将创建...")
        conn.execute(text("""
            CREATE TABLE user_organizations (
                id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
                user_id VARCHAR(36) NOT NULL,
                organization_id VARCHAR(36) NOT NULL,
                is_primary BOOLEAN DEFAULT FALSE,
                position VARCHAR(100),
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status userorgstatus DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
                UNIQUE(user_id, organization_id)
            )
        """))
        print("✅ user_organizations 表创建完成")

def fix_users_table(conn, inspector):
    """修复 users 表"""
    print("检查 users 表...")
    
    if 'users' in inspector.get_table_names():
        columns = {col['name']: col for col in inspector.get_columns('users')}
        
        # 检查必需字段
        required_fields = [
            ('avatar_url', 'TEXT'),
            ('status', 'user_status DEFAULT \'ACTIVE\''),
            ('last_login_at', 'TIMESTAMP'),
            ('created_by', 'VARCHAR(36)'),
            ('updated_by', 'VARCHAR(36)')
        ]
        
        for field_name, field_def in required_fields:
            if field_name not in columns:
                print(f"添加字段 users.{field_name}...")
                try:
                    conn.execute(text(f"""
                        ALTER TABLE users 
                        ADD COLUMN IF NOT EXISTS {field_name} {field_def}
                    """))
                except Exception as e:
                    print(f"⚠️ 字段 {field_name} 添加失败: {e}")

def fix_organizations_table(conn, inspector):
    """修复 organizations 表"""
    print("检查 organizations 表...")
    
    if 'organizations' in inspector.get_table_names():
        columns = {col['name']: col for col in inspector.get_columns('organizations')}
        
        # 检查必需字段
        required_fields = [
            ('parent_id', 'VARCHAR(36)'),
            ('path', 'VARCHAR(1000)'),
            ('level', 'INTEGER DEFAULT 1'),
            ('sort_order', 'INTEGER DEFAULT 0'),
            ('status', 'organizationstatus DEFAULT \'ACTIVE\''),
            ('created_by', 'VARCHAR(36)'),
            ('updated_by', 'VARCHAR(36)')
        ]
        
        for field_name, field_def in required_fields:
            if field_name not in columns:
                print(f"添加字段 organizations.{field_name}...")
                try:
                    conn.execute(text(f"""
                        ALTER TABLE organizations 
                        ADD COLUMN IF NOT EXISTS {field_name} {field_def}
                    """))
                except Exception as e:
                    print(f"⚠️ 字段 {field_name} 添加失败: {e}")

def fix_user_roles_table(conn, inspector):
    """修复 user_roles 表"""
    print("检查 user_roles 表...")
    
    if 'user_roles' in inspector.get_table_names():
        columns = {col['name']: col for col in inspector.get_columns('user_roles')}
        
        # 检查必需字段
        if 'status' not in columns:
            print("添加字段 user_roles.status...")
            try:
                conn.execute(text("""
                    ALTER TABLE user_roles 
                    ADD COLUMN IF NOT EXISTS status userrolestatus DEFAULT 'ACTIVE'
                """))
            except Exception as e:
                print(f"⚠️ 字段 status 添加失败: {e}")

def fix_organization_tables(conn, inspector):
    """修复组织相关表"""
    print("检查组织相关表...")
    
    # 这里可以添加其他组织相关表的检查和修复
    pass

def fix_other_system_tables(conn, inspector):
    """修复其他系统表"""
    print("检查其他系统表...")
    
    # 检查并修复 datasets 表
    if 'datasets' in inspector.get_table_names():
        print("修复 datasets 表结构...")
        
        # 从 add_missing_columns.sql 中的修复应用到这里
        required_columns = [
            ('dataset_type', 'VARCHAR(50)'),
            ('dataset_format', 'VARCHAR(50)'),
            ('status', 'VARCHAR(50) DEFAULT \'pending\''),
            ('generation_progress', 'INTEGER DEFAULT 0'),
            ('file_path', 'VARCHAR(500)'),
            ('file_size', 'BIGINT'),
            ('record_count', 'INTEGER'),
            ('error_message', 'TEXT'),
            ('meta_data', 'JSONB'),
            ('completed_at', 'TIMESTAMP')
        ]
        
        for col_name, col_def in required_columns:
            try:
                conn.execute(text(f"""
                    ALTER TABLE datasets 
                    ADD COLUMN IF NOT EXISTS {col_name} {col_def}
                """))
            except Exception as e:
                print(f"⚠️ datasets.{col_name} 添加失败: {e}")
        
        # 处理 metadata -> meta_data 重命名
        try:
            conn.execute(text("""
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.columns 
                              WHERE table_name = 'datasets' AND column_name = 'metadata') THEN
                        ALTER TABLE datasets RENAME COLUMN metadata TO meta_data;
                    END IF;
                END
                $$;
            """))
        except Exception as e:
            print(f"⚠️ metadata重命名失败: {e}")

def ensure_required_indexes(conn, inspector):
    """确保所有必需的索引存在"""
    print("检查并创建必需的索引...")
    
    indexes_to_create = [
        ('user_organizations', 'idx_user_organizations_user_id', ['user_id']),
        ('user_organizations', 'idx_user_organizations_org_id', ['organization_id']),
        ('user_organizations', 'idx_user_organizations_status', ['status']),
        ('users', 'idx_users_username', ['username']),
        ('users', 'idx_users_email', ['email']),
        ('users', 'idx_users_status', ['status']),
        ('organizations', 'idx_organizations_code', ['code']),
        ('organizations', 'idx_organizations_parent_id', ['parent_id']),
        ('datasets', 'idx_datasets_dataset_type', ['dataset_type']),
        ('datasets', 'idx_datasets_status', ['status']),
    ]
    
    for table_name, index_name, columns in indexes_to_create:
        try:
            columns_str = ', '.join(columns)
            conn.execute(text(f"""
                CREATE INDEX IF NOT EXISTS {index_name} 
                ON {table_name} ({columns_str})
            """))
        except Exception as e:
            print(f"⚠️ 索引 {index_name} 创建失败: {e}")

def sync_migration_records(conn):
    """同步迁移记录"""
    print("同步迁移记录...")
    
    # 要标记为已执行的迁移版本
    historical_migrations = [
        ('v1.0.0', 'v1.0.0_create_user_management_migration.py'),
        ('v1.0.1', 'v1.0.1_fix_existing_tables_migration.py'),
        ('v1.0.2', 'v1.0.2_add_user_avatar_field_migration.py'),
        ('v1.0.3', 'v1.0.3_ensure_governance_permissions_migration.py'),
        ('v1.0.4', 'v1.0.4_add_user_organizations_status_migration.py'),
        ('v1.0.5', 'v1.0.5_add_user_organizations_timestamps_migration.py'),
        ('v1.0.6', 'v1.0.6_fix_user_organizations_enum_migration.py'),
        ('v1.0.7', 'v1.0.7_add_annotation_fields_migration.py'),
        ('v1.0.8', 'v1.0.8_add_original_filename_migration.py'),
        ('v1.0.8', 'v1.0.8_fix_annotation_history_nullable_migration.py'),
        ('v1.0.9', 'v1.0.9_create_raw_data_table_migration.py'),
        ('v1.0.10', 'v1.0.10_rename_metadata_field_migration.py'),
        ('v1.0.11', 'v1.0.11_add_library_file_id_to_raw_data_migration.py'),
    ]
    
    for version, filename in historical_migrations:
        try:
            # 检查是否已存在记录
            result = conn.execute(text("""
                SELECT COUNT(*) FROM schema_migrations WHERE version = :version
            """), {'version': version})
            
            count = result.fetchone()[0]
            
            if count == 0:
                # 添加迁移记录
                conn.execute(text("""
                    INSERT INTO schema_migrations 
                    (version, filename, checksum, execution_time_ms, status)
                    VALUES (:version, :filename, 'sync', 0, 'SUCCESS')
                """), {
                    'version': version,
                    'filename': filename
                })
                print(f"✅ 已标记迁移 {version} 为已执行")
        except Exception as e:
            print(f"⚠️ 同步迁移记录 {version} 失败: {e}")

def down(conn):
    """回滚迁移 - 注意：这个迁移不建议回滚"""
    print("⚠️ 警告: 此迁移不建议回滚，因为它是数据库结构修复迁移")
    print("如果确实需要回滚，请手动处理相关表结构")

def get_migration_info():
    """获取迁移信息"""
    return {
        'version': MIGRATION_VERSION,
        'description': MIGRATION_DESCRIPTION,
        'author': MIGRATION_AUTHOR,
        'date': MIGRATION_DATE
    } 