#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
数据库迁移: 创建或更新 raw_data 表
版本: v1.0.9
创建时间: 2024-01-15
描述: 创建完整的 raw_data 表结构，包含所有必需的列
"""

import os
import sys
import logging
from datetime import datetime
from sqlalchemy import text, Column, String, Integer, BigInteger, DateTime, Text, JSON, Boolean
from sqlalchemy.exc import ProgrammingError

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import db

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_table_exists(table_name):
    """检查表是否存在"""
    try:
        result = db.session.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = :table_name
        """), {"table_name": table_name})
        
        return result.fetchone() is not None
    except Exception as e:
        logger.error(f"检查表是否存在时出错: {e}")
        return False

def get_table_columns(table_name):
    """获取表的所有列"""
    try:
        result = db.session.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = :table_name
        """), {"table_name": table_name})
        
        return [row[0] for row in result.fetchall()]
    except Exception as e:
        logger.error(f"获取表列信息时出错: {e}")
        return []

def run_migration():
    """执行迁移"""
    try:
        logger.info("开始执行 v1.0.9 数据库迁移...")
        
        # 检查表是否存在
        table_exists = check_table_exists('raw_data')
        
        if not table_exists:
            # 创建新表
            logger.info("创建 raw_data 表...")
            create_table_sql = """
            CREATE TABLE raw_data (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL,
                original_filename VARCHAR(255),
                file_type VARCHAR(50) NOT NULL,
                file_category VARCHAR(50),
                file_size BIGINT,
                minio_object_name VARCHAR(500) NOT NULL,
                dataset_id INTEGER,
                data_source_id VARCHAR(36),
                data_source_config_id VARCHAR(36),
                checksum VARCHAR(64),
                mime_type VARCHAR(100),
                encoding VARCHAR(50),
                processing_status VARCHAR(50) DEFAULT 'pending',
                processing_error TEXT,
                processing_progress INTEGER DEFAULT 0,
                file_metadata JSONB,
                extraction_metadata JSONB,
                preview_content TEXT,
                thumbnail_path VARCHAR(500),
                sample_data JSONB,
                extracted_text TEXT,
                page_count INTEGER,
                word_count INTEGER,
                image_width INTEGER,
                image_height INTEGER,
                color_mode VARCHAR(20),
                duration INTEGER,
                video_width INTEGER,
                video_height INTEGER,
                frame_rate VARCHAR(20),
                video_codec VARCHAR(50),
                audio_codec VARCHAR(50),
                record_count INTEGER,
                schema_info JSONB,
                api_response_time INTEGER,
                data_source_metadata JSONB,
                content_quality_score INTEGER DEFAULT 0,
                extraction_confidence INTEGER DEFAULT 0,
                upload_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_at TIMESTAMP
            );
            """
            
            db.session.execute(text(create_table_sql))
            db.session.commit()
            logger.info("成功创建 raw_data 表")
            
        else:
            # 表已存在，检查并添加缺失的列
            logger.info("raw_data 表已存在，检查并添加缺失的列...")
            
            existing_columns = get_table_columns('raw_data')
            logger.info(f"现有列: {existing_columns}")
            
            # 定义所有需要的列
            required_columns = {
                'file_category': 'VARCHAR(50)',
                'data_source_id': 'VARCHAR(36)',
                'data_source_config_id': 'VARCHAR(36)',
                'original_filename': 'VARCHAR(255)',
                'checksum': 'VARCHAR(64)',
                'mime_type': 'VARCHAR(100)',
                'encoding': 'VARCHAR(50)',
                'processing_status': 'VARCHAR(50) DEFAULT \'pending\'',
                'processing_error': 'TEXT',
                'processing_progress': 'INTEGER DEFAULT 0',
                'file_metadata': 'JSONB',
                'extraction_metadata': 'JSONB',
                'preview_content': 'TEXT',
                'thumbnail_path': 'VARCHAR(500)',
                'sample_data': 'JSONB',
                'extracted_text': 'TEXT',
                'page_count': 'INTEGER',
                'word_count': 'INTEGER',
                'image_width': 'INTEGER',
                'image_height': 'INTEGER',
                'color_mode': 'VARCHAR(20)',
                'duration': 'INTEGER',
                'video_width': 'INTEGER',
                'video_height': 'INTEGER',
                'frame_rate': 'VARCHAR(20)',
                'video_codec': 'VARCHAR(50)',
                'audio_codec': 'VARCHAR(50)',
                'record_count': 'INTEGER',
                'schema_info': 'JSONB',
                'api_response_time': 'INTEGER',
                'data_source_metadata': 'JSONB',
                'content_quality_score': 'INTEGER DEFAULT 0',
                'extraction_confidence': 'INTEGER DEFAULT 0',
                'upload_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
                'processed_at': 'TIMESTAMP'
            }
            
            # 添加缺失的列
            for column_name, column_type in required_columns.items():
                if column_name not in existing_columns:
                    logger.info(f"添加列: {column_name}")
                    db.session.execute(text(f"""
                        ALTER TABLE raw_data ADD COLUMN {column_name} {column_type};
                    """))
            
            db.session.commit()
            logger.info("成功添加缺失的列")
        
        # 创建索引
        logger.info("创建索引...")
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_raw_data_filename ON raw_data(filename);",
            "CREATE INDEX IF NOT EXISTS idx_raw_data_file_type ON raw_data(file_type);",
            "CREATE INDEX IF NOT EXISTS idx_raw_data_file_category ON raw_data(file_category);",
            "CREATE INDEX IF NOT EXISTS idx_raw_data_dataset_id ON raw_data(dataset_id);",
            "CREATE INDEX IF NOT EXISTS idx_raw_data_data_source_id ON raw_data(data_source_id);",
            "CREATE INDEX IF NOT EXISTS idx_raw_data_processing_status ON raw_data(processing_status);",
            "CREATE INDEX IF NOT EXISTS idx_raw_data_upload_at ON raw_data(upload_at);"
        ]
        
        for index_sql in indexes:
            try:
                db.session.execute(text(index_sql))
            except Exception as e:
                logger.warning(f"创建索引失败（可能已存在）: {e}")
        
        db.session.commit()
        logger.info("索引创建完成")
        
        # 验证迁移结果
        logger.info("验证迁移结果...")
        final_columns = get_table_columns('raw_data')
        logger.info(f"最终列数: {len(final_columns)}")
        logger.info(f"包含的列: {sorted(final_columns)}")
        
        # 检查记录数
        result = db.session.execute(text("SELECT COUNT(*) FROM raw_data;"))
        count = result.scalar()
        logger.info(f"表中记录数: {count}")
        
        logger.info("v1.0.9 数据库迁移完成!")
        return True
        
    except Exception as e:
        logger.error(f"迁移失败: {e}")
        db.session.rollback()
        raise e

def rollback_migration():
    """回滚迁移（仅用于测试）"""
    try:
        logger.info("开始回滚 v1.0.9 数据库迁移...")
        logger.warning("此操作将删除 raw_data 表及其所有数据！")
        
        # 删除表
        db.session.execute(text("DROP TABLE IF EXISTS raw_data CASCADE;"))
        db.session.commit()
        
        logger.info("v1.0.9 数据库迁移回滚完成!")
        return True
        
    except Exception as e:
        logger.error(f"回滚失败: {e}")
        db.session.rollback()
        raise e

if __name__ == '__main__':
    from app import create_app
    
    app = create_app()
    with app.app_context():
        import sys
        if len(sys.argv) > 1 and sys.argv[1] == 'rollback':
            rollback_migration()
        else:
            run_migration() 