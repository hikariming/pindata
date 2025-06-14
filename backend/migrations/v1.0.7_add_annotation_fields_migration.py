#!/usr/bin/env python3
"""
v1.0.7 为governed_data表添加多媒体标注相关字段

这个迁移为governed_data表添加标注数据相关字段，
用于支持图像、视频、音频等多媒体内容的标注功能。
"""

from sqlalchemy import text
from datetime import datetime

MIGRATION_VERSION = "v1.0.7"
MIGRATION_DESCRIPTION = "为governed_data表添加多媒体标注相关字段"
MIGRATION_AUTHOR = "系统"
MIGRATION_DATE = datetime.now().isoformat()

def up(conn):
    """添加governed_data表的多媒体标注相关字段"""
    print(f"执行迁移: {MIGRATION_DESCRIPTION}")
    
    cursor = conn.cursor()
    
    # 1. 创建标注类型枚举（如果不存在）
    print("创建标注类型枚举...")
    try:
        cursor.execute("""
            CREATE TYPE annotationtype AS ENUM (
                'image_qa',
                'image_caption', 
                'image_classification',
                'image_object_detection',
                'video_transcript',
                'video_qa',
                'video_summary',
                'video_scene_detection',
                'audio_transcript',
                'text_extraction',
                'custom'
            );
        """)
    except Exception as e:
        if "already exists" in str(e).lower():
            print("  标注类型枚举已存在，跳过...")
        else:
            raise e
    
    # 2. 创建标注来源枚举（如果不存在）
    print("创建标注来源枚举...")
    try:
        cursor.execute("""
            CREATE TYPE annotationsource AS ENUM (
                'ai_generated',
                'human_annotated',
                'ai_assisted',
                'imported'
            );
        """)
    except Exception as e:
        if "already exists" in str(e).lower():
            print("  标注来源枚举已存在，跳过...")
        else:
            raise e
    
    # 3. 添加多媒体标注相关字段
    print("添加标注数据字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        ADD COLUMN IF NOT EXISTS annotation_data JSON;
    """)
    
    print("添加标注类型字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        ADD COLUMN IF NOT EXISTS annotation_type annotationtype;
    """)
    
    print("添加标注来源字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        ADD COLUMN IF NOT EXISTS annotation_source annotationsource;
    """)
    
    print("添加AI标注字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        ADD COLUMN IF NOT EXISTS ai_annotations JSON;
    """)
    
    print("添加人工标注字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        ADD COLUMN IF NOT EXISTS human_annotations JSON;
    """)
    
    print("添加标注置信度字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        ADD COLUMN IF NOT EXISTS annotation_confidence DOUBLE PRECISION DEFAULT 0.0;
    """)
    
    print("添加标注元数据字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        ADD COLUMN IF NOT EXISTS annotation_metadata JSON;
    """)
    
    print("添加审核状态字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        ADD COLUMN IF NOT EXISTS review_status VARCHAR(50) DEFAULT 'pending';
    """)
    
    print("添加审核人ID字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(36);
    """)
    
    print("添加审核意见字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        ADD COLUMN IF NOT EXISTS review_comments TEXT;
    """)
    
    cursor.close()
    print("✅ 多媒体标注字段添加完成")

def down(conn):
    """回滚：删除governed_data表的多媒体标注相关字段"""
    print(f"回滚迁移: {MIGRATION_DESCRIPTION}")
    
    cursor = conn.cursor()
    
    # 删除添加的字段
    print("删除审核意见字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        DROP COLUMN IF EXISTS review_comments;
    """)
    
    print("删除审核人ID字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        DROP COLUMN IF EXISTS reviewer_id;
    """)
    
    print("删除审核状态字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        DROP COLUMN IF EXISTS review_status;
    """)
    
    print("删除标注元数据字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        DROP COLUMN IF EXISTS annotation_metadata;
    """)
    
    print("删除标注置信度字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        DROP COLUMN IF EXISTS annotation_confidence;
    """)
    
    print("删除人工标注字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        DROP COLUMN IF EXISTS human_annotations;
    """)
    
    print("删除AI标注字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        DROP COLUMN IF EXISTS ai_annotations;
    """)
    
    print("删除标注来源字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        DROP COLUMN IF EXISTS annotation_source;
    """)
    
    print("删除标注类型字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        DROP COLUMN IF EXISTS annotation_type;
    """)
    
    print("删除标注数据字段...")
    cursor.execute("""
        ALTER TABLE governed_data 
        DROP COLUMN IF EXISTS annotation_data;
    """)
    
    # 删除枚举类型
    print("删除标注来源枚举...")
    cursor.execute("""
        DROP TYPE IF EXISTS annotationsource CASCADE;
    """)
    
    print("删除标注类型枚举...")
    cursor.execute("""
        DROP TYPE IF EXISTS annotationtype CASCADE;
    """)
    
    cursor.close()
    print("✅ 多媒体标注字段删除完成")

if __name__ == "__main__":
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    from config.config import Config
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

    print('开始执行 v1.0.7 迁移...')

    try:
        # 连接数据库
        conn = psycopg2.connect(Config.SQLALCHEMY_DATABASE_URI)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        
        # 执行迁移
        up(conn)
        
        print('\n✅ 迁移执行成功！')
        
    except Exception as e:
        print(f'❌ 迁移执行失败: {e}')
        import traceback
        traceback.print_exc()
    finally:
        if 'conn' in locals():
            conn.close()