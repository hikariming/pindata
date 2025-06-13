#!/usr/bin/env python3
"""
v1.0.5 为user_organizations表添加时间戳列

这个迁移为user_organizations表添加created_at和updated_at列，
用于跟踪记录的创建和更新时间。
"""

from sqlalchemy import text
from datetime import datetime

MIGRATION_VERSION = "v1.0.5"
MIGRATION_DESCRIPTION = "为user_organizations表添加时间戳列"
MIGRATION_AUTHOR = "系统"
MIGRATION_DATE = datetime.now().isoformat()

def up(conn):
    """添加user_organizations表的时间戳列"""
    print(f"执行迁移: {MIGRATION_DESCRIPTION}")
    
    # 添加created_at列
    print("添加created_at列...")
    conn.execute(text("""
        ALTER TABLE user_organizations 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    """))
    
    # 添加updated_at列
    print("添加updated_at列...")
    conn.execute(text("""
        ALTER TABLE user_organizations 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    """))
    
    print("✓ 时间戳列添加完成")

def down(conn):
    """回滚：删除user_organizations表的时间戳列"""
    print(f"回滚迁移: {MIGRATION_DESCRIPTION}")
    
    # 删除updated_at列
    print("删除updated_at列...")
    conn.execute(text("""
        ALTER TABLE user_organizations 
        DROP COLUMN IF EXISTS updated_at
    """))
    
    # 删除created_at列
    print("删除created_at列...")
    conn.execute(text("""
        ALTER TABLE user_organizations 
        DROP COLUMN IF EXISTS created_at
    """))
    
    print("✓ 时间戳列删除完成") 