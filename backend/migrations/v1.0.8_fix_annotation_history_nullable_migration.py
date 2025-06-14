#!/usr/bin/env python3
"""
Fix annotation_history annotation_id nullable constraint

This migration makes the annotation_id field in annotation_history table
nullable to support deletion history records where the referenced annotation
no longer exists.
"""

from sqlalchemy import text
from datetime import datetime

# 迁移信息
MIGRATION_VERSION = "v1.0.8"
MIGRATION_DESCRIPTION = "修复annotation_history表annotation_id字段可为空约束"
MIGRATION_AUTHOR = "系统"
MIGRATION_DATE = datetime.now().isoformat()

def up(conn):
    """
    执行迁移 - 将annotation_history.annotation_id字段修改为可为空
    
    Args:
        conn: SQLAlchemy数据库连接对象
    """
    print(f"执行迁移: {MIGRATION_DESCRIPTION}")
    
    # 修改annotation_id字段为可为空
    conn.execute(text("""
        ALTER TABLE annotation_history 
        ALTER COLUMN annotation_id DROP NOT NULL
    """))
    
    print("✅ 迁移执行完成")

def down(conn):
    """
    回滚迁移 - 将annotation_id字段恢复为不可为空
    注意：这个回滚可能会失败，如果表中存在annotation_id为null的记录
    
    Args:
        conn: SQLAlchemy数据库连接对象
    """
    print(f"回滚迁移: {MIGRATION_DESCRIPTION}")
    
    # 先删除所有annotation_id为null的记录（如果有的话）
    conn.execute(text("""
        DELETE FROM annotation_history 
        WHERE annotation_id IS NULL
    """))
    
    # 然后将字段恢复为不可为空
    conn.execute(text("""
        ALTER TABLE annotation_history 
        ALTER COLUMN annotation_id SET NOT NULL
    """))
    
    print("✅ 迁移回滚完成")

def get_migration_info():
    """获取迁移信息"""
    return {
        'version': MIGRATION_VERSION,
        'description': MIGRATION_DESCRIPTION,
        'author': MIGRATION_AUTHOR,
        'date': MIGRATION_DATE
    }