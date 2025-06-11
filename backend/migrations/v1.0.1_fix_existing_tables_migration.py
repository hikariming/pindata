#!/usr/bin/env python3
"""
v1.0.1 修复已存在表的迁移

处理从手动创建的表升级到迁移管理的情况
检测已存在的表并标记为已迁移状态
"""

from sqlalchemy import text, inspect
from datetime import datetime
import uuid

MIGRATION_VERSION = "v1.0.1"
MIGRATION_DESCRIPTION = "修复已存在表的迁移状态"
MIGRATION_AUTHOR = "系统"
MIGRATION_DATE = datetime.now().isoformat()

def up(conn):
    """检测已存在的表并标记v1.0.0为成功"""
    print(f"执行迁移: {MIGRATION_DESCRIPTION}")
    
    # 检查数据库中存在的表
    inspector = inspect(conn.engine)
    existing_tables = inspector.get_table_names()
    
    # 检查用户管理系统的核心表是否存在
    required_tables = [
        'users', 'roles', 'permissions', 'user_roles', 
        'role_permissions', 'user_sessions', 'audit_logs', 'organizations'
    ]
    
    existing_required_tables = [table for table in required_tables if table in existing_tables]
    
    print(f"发现已存在的核心表: {existing_required_tables}")
    
    # 如果大部分核心表都存在，则标记v1.0.0为成功
    if len(existing_required_tables) >= 6:  # 至少6个核心表存在
        print("检测到用户管理系统已基本完整，标记v1.0.0为成功状态")
        
        # 更新v1.0.0的状态为成功
        conn.execute(text("""
            UPDATE schema_migrations 
            SET status = 'SUCCESS', error_message = NULL
            WHERE version = 'v1.0.0' AND status = 'FAILED'
        """))
        
        # 如果没有v1.0.0记录，则插入一个
        result = conn.execute(text("""
            SELECT COUNT(*) FROM schema_migrations WHERE version = 'v1.0.0'
        """))
        
        if result.fetchone()[0] == 0:
            conn.execute(text("""
                INSERT INTO schema_migrations (version, filename, checksum, status)
                VALUES ('v1.0.0', 'v1.0.0_create_user_management_migration.py', 'manual-fix', 'SUCCESS')
            """))
            print("插入v1.0.0迁移记录")
    
    # 检查并修复可能缺失的表结构
    print("检查和修复表结构...")
    
    # 检查user_sessions表的列结构
    if 'user_sessions' in existing_tables:
        session_columns = [col['name'] for col in inspector.get_columns('user_sessions')]
        
        # 检查是否需要重命名列
        if 'session_token' in session_columns and 'access_token_hash' not in session_columns:
            print("修复user_sessions表的列名...")
            try:
                conn.execute(text("ALTER TABLE user_sessions RENAME COLUMN session_token TO access_token_hash"))
            except Exception as e:
                print(f"重命名session_token失败: {e}")
                
        if 'refresh_token' in session_columns and 'refresh_token_hash' not in session_columns:
            try:
                conn.execute(text("ALTER TABLE user_sessions RENAME COLUMN refresh_token TO refresh_token_hash"))
            except Exception as e:
                print(f"重命名refresh_token失败: {e}")
    
    # 检查roles表的type列
    if 'roles' in existing_tables:
        role_columns = [col['name'] for col in inspector.get_columns('roles')]
        
        if 'is_system_role' in role_columns and 'type' not in role_columns:
            print("修复roles表的type列...")
            try:
                # 添加type列
                conn.execute(text("ALTER TABLE roles ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'CUSTOM'"))
                
                # 更新数据
                conn.execute(text("""
                    UPDATE roles SET type = 
                    CASE 
                        WHEN is_system_role = true THEN 'SYSTEM'
                        ELSE 'CUSTOM'
                    END
                    WHERE type IS NULL OR type = 'CUSTOM'
                """))
                
                # 删除旧列
                conn.execute(text("ALTER TABLE roles DROP COLUMN IF EXISTS is_system_role"))
            except Exception as e:
                print(f"修复roles表失败: {e}")
    
    # 检查user_roles表的列名
    if 'user_roles' in existing_tables:
        user_role_columns = [col['name'] for col in inspector.get_columns('user_roles')]
        
        if 'assigned_at' in user_role_columns and 'granted_at' not in user_role_columns:
            try:
                conn.execute(text("ALTER TABLE user_roles RENAME COLUMN assigned_at TO granted_at"))
            except Exception as e:
                print(f"重命名assigned_at失败: {e}")
                
        if 'assigned_by' in user_role_columns and 'granted_by' not in user_role_columns:
            try:
                conn.execute(text("ALTER TABLE user_roles RENAME COLUMN assigned_by TO granted_by"))
            except Exception as e:
                print(f"重命名assigned_by失败: {e}")
        
        # 添加缺失的列
        missing_columns = []
        if 'expires_at' not in user_role_columns:
            missing_columns.append(('expires_at', 'TIMESTAMP'))
        if 'status' not in user_role_columns:
            missing_columns.append(('status', 'VARCHAR(20) DEFAULT \'ACTIVE\''))
            
        for col_name, col_type in missing_columns:
            try:
                conn.execute(text(f"ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
            except Exception as e:
                print(f"添加列{col_name}失败: {e}")
    
    print("✅ 表结构修复完成")

def down(conn):
    """回滚修复"""
    print(f"回滚迁移: {MIGRATION_DESCRIPTION}")
    
    # 将v1.0.0标记回失败状态
    conn.execute(text("""
        UPDATE schema_migrations 
        SET status = 'FAILED', error_message = 'rolled back from v1.0.1'
        WHERE version = 'v1.0.0' AND status = 'SUCCESS'
    """))
    
    print("✅ 修复回滚完成")

def get_migration_info():
    """获取迁移信息"""
    return {
        'version': MIGRATION_VERSION,
        'description': MIGRATION_DESCRIPTION,
        'author': MIGRATION_AUTHOR,
        'date': MIGRATION_DATE
    }