#!/usr/bin/env python3
"""
迁移脚本: v1.0.13_add_reasoning_support_to_llm_config_migration.py
描述: 为LLMConfig模型添加对思考过程的支持，增加相关字段。
"""

from sqlalchemy import text
from datetime import datetime

# 迁移信息
MIGRATION_VERSION = "v1.0.13"
MIGRATION_DESCRIPTION = "为LLMConfig模型添加对思考过程的支持"
MIGRATION_AUTHOR = "Gemini"
MIGRATION_DATE = datetime.now().isoformat()

def up(conn):
    """
    执行迁移 - 在llm_configs表中添加新字段
    """
    print(f"执行迁移: {MIGRATION_DESCRIPTION}")

    # 创建新的枚举类型
    conn.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reasoningextractionmethod') THEN
                CREATE TYPE reasoningextractionmethod AS ENUM ('tag_based', 'json_field');
            END IF;
        END$$;
    """))

    # 添加新列
    conn.execute(text("""
        ALTER TABLE llm_configs
        ADD COLUMN IF NOT EXISTS supports_reasoning BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS reasoning_extraction_method reasoningextractionmethod,
        ADD COLUMN IF NOT EXISTS reasoning_extraction_config JSONB;
    """))
    
    print("✅ 迁移执行完成")

def down(conn):
    """
    回滚迁移 - 从llm_configs表中删除添加的字段
    """
    print(f"回滚迁移: {MIGRATION_DESCRIPTION}")
    
    conn.execute(text("""
        ALTER TABLE llm_configs
        DROP COLUMN IF EXISTS supports_reasoning,
        DROP COLUMN IF EXISTS reasoning_extraction_method,
        DROP COLUMN IF EXISTS reasoning_extraction_config;
    """))

    # 注意：通常不建议在回滚时删除类型，因为它可能被其他表或函数使用。
    # 如果确定安全，可以取消下面的注释。
    # conn.execute(text("DROP TYPE IF EXISTS reasoningextractionmethod;"))
    
    print("✅ 迁移回滚完成")

def get_migration_info():
    """获取迁移信息"""
    return {
        'version': MIGRATION_VERSION,
        'description': MIGRATION_DESCRIPTION,
        'author': MIGRATION_AUTHOR,
        'date': MIGRATION_DATE
    }
