#!/usr/bin/env python3
"""
迁移脚本模板

文件命名规范: v{major}.{minor}.{patch}_{description}_migration.py
例如: v1.0.0_create_users_migration.py

每个迁移文件必须包含：
1. up(conn) 函数 - 执行迁移
2. down(conn) 函数 - 回滚迁移 (可选)
3. 描述信息

迁移原则：
- 每个迁移都应该是幂等的（可以重复执行）
- 使用 IF NOT EXISTS 确保表和索引创建安全
- 数据迁移要考虑大表的性能
- 提供回滚方案
"""

from sqlalchemy import text
from datetime import datetime

# 迁移信息
MIGRATION_VERSION = "v1.0.2"
MIGRATION_DESCRIPTION = "add user avatar field"
MIGRATION_AUTHOR = "系统"
MIGRATION_DATE = "2025-06-11T21:56:02.166969"

def up(conn):
    """
    执行迁移 - 将数据库从旧状态升级到新状态
    
    Args:
        conn: SQLAlchemy数据库连接对象
    """
    print(f"执行迁移: {MIGRATION_DESCRIPTION}")
    
    # 示例：创建表
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS example_table (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """))
    
    # 示例：添加索引
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_example_name 
        ON example_table (name)
    """))
    
    # 示例：插入初始数据
    conn.execute(text("""
        INSERT INTO example_table (name) 
        SELECT 'default_value' 
        WHERE NOT EXISTS (
            SELECT 1 FROM example_table WHERE name = 'default_value'
        )
    """))
    
    print("✅ 迁移执行完成")

def down(conn):
    """
    回滚迁移 - 将数据库从新状态回滚到旧状态
    
    Args:
        conn: SQLAlchemy数据库连接对象
    """
    print(f"回滚迁移: {MIGRATION_DESCRIPTION}")
    
    # 示例：删除表
    conn.execute(text("DROP TABLE IF EXISTS example_table CASCADE"))
    
    print("✅ 迁移回滚完成")

def get_migration_info():
    """获取迁移信息"""
    return {
        'version': MIGRATION_VERSION,
        'description': MIGRATION_DESCRIPTION,
        'author': MIGRATION_AUTHOR,
        'date': MIGRATION_DATE
    }