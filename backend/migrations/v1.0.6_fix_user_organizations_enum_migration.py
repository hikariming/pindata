#!/usr/bin/env python3
"""
v1.0.6 修复user_organizations表的枚举类型

这个迁移修复user_organizations表的status枚举类型，
确保使用大写的枚举值。
"""

from sqlalchemy import text
from datetime import datetime

MIGRATION_VERSION = "v1.0.6"
MIGRATION_DESCRIPTION = "修复user_organizations表的枚举类型"
MIGRATION_AUTHOR = "系统"
MIGRATION_DATE = datetime.now().isoformat()

def up(conn):
    """修复user_organizations表的枚举类型"""
    print(f"执行迁移: {MIGRATION_DESCRIPTION}")
    
    # 1. 删除旧的枚举类型
    print("删除旧的枚举类型...")
    conn.execute(text("""
        DROP TYPE IF EXISTS userorgstatus CASCADE;
    """))
    
    # 2. 创建新的枚举类型
    print("创建新的枚举类型...")
    conn.execute(text("""
        CREATE TYPE userorgstatus AS ENUM ('ACTIVE', 'INACTIVE');
    """))
    
    # 3. 更新现有记录的status值
    print("更新现有记录的status值...")
    conn.execute(text("""
        UPDATE user_organizations 
        SET status = 'ACTIVE' 
        WHERE status = 'active';
        
        UPDATE user_organizations 
        SET status = 'INACTIVE' 
        WHERE status = 'inactive';
    """))
    
    print("✅ 枚举类型修复完成")

def down(conn):
    """回滚：恢复旧的枚举类型"""
    print(f"回滚迁移: {MIGRATION_DESCRIPTION}")
    
    # 1. 删除新的枚举类型
    print("删除新的枚举类型...")
    conn.execute(text("""
        DROP TYPE IF EXISTS userorgstatus CASCADE;
    """))
    
    # 2. 创建旧的枚举类型
    print("创建旧的枚举类型...")
    conn.execute(text("""
        CREATE TYPE userorgstatus AS ENUM ('active', 'inactive');
    """))
    
    # 3. 恢复现有记录的status值
    print("恢复现有记录的status值...")
    conn.execute(text("""
        UPDATE user_organizations 
        SET status = 'active' 
        WHERE status = 'ACTIVE';
        
        UPDATE user_organizations 
        SET status = 'inactive' 
        WHERE status = 'INACTIVE';
    """))
    
    print("✅ 枚举类型回滚完成") 