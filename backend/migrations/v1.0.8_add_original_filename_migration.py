#!/usr/bin/env python3
"""
v1.0.8 为raw_data表添加original_filename字段

这个迁移为raw_data表添加original_filename字段，
用于存储文件的原始文件名。
"""

from sqlalchemy import text
from datetime import datetime

MIGRATION_VERSION = "v1.0.8"
MIGRATION_DESCRIPTION = "为raw_data表添加original_filename字段"
MIGRATION_AUTHOR = "系统"
MIGRATION_DATE = datetime.now().isoformat()

def up(conn):
    """添加original_filename字段"""
    print(f"执行迁移: {MIGRATION_DESCRIPTION}")
    
    # 检查字段是否已存在
    result = conn.execute(text("""
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name = 'raw_data' 
        AND column_name = 'original_filename'
    """))
    
    column_exists = result.fetchone()[0] > 0
    
    if not column_exists:
        print("为raw_data表添加original_filename字段...")
        conn.execute(text("""
            ALTER TABLE raw_data 
            ADD COLUMN original_filename VARCHAR(255)
        """))
        print("✅ original_filename字段添加成功")
    else:
        print("ℹ️  original_filename字段已存在，跳过添加")
    
    print("✅ 迁移执行完成")

def down(conn):
    """移除original_filename字段"""
    print(f"回滚迁移: {MIGRATION_DESCRIPTION}")
    
    # 检查字段是否存在
    result = conn.execute(text("""
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name = 'raw_data' 
        AND column_name = 'original_filename'
    """))
    
    column_exists = result.fetchone()[0] > 0
    
    if column_exists:
        print("从raw_data表移除original_filename字段...")
        conn.execute(text("""
            ALTER TABLE raw_data 
            DROP COLUMN original_filename
        """))
        print("✅ original_filename字段移除成功")
    else:
        print("ℹ️  original_filename字段不存在，跳过移除")
    
    print("✅ 迁移回滚完成")

def get_migration_info():
    """获取迁移信息"""
    return {
        'version': MIGRATION_VERSION,
        'description': MIGRATION_DESCRIPTION,
        'author': MIGRATION_AUTHOR,
        'date': MIGRATION_DATE
    }