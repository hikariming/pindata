#!/usr/bin/env python3
"""
数据库迁移脚本 - v1.0.11
为 raw_data 表添加 library_file_id 字段以关联文件库中的文件
"""

import logging
import psycopg2
from datetime import datetime

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AddLibraryFileIdToRawDataV1_0_11:
    """为 raw_data 表添加 library_file_id 字段的迁移类"""
    
    def __init__(self, connection):
        self.connection = connection
        self.version = 'v1.0.11'
        
    def migrate(self):
        """执行迁移"""
        logger.info(f"开始执行迁移 {self.version}")
        
        try:
            cursor = self.connection.cursor()
            
            # 检查 raw_data 表是否存在 library_file_id 列
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'raw_data' 
                AND column_name = 'library_file_id'
            """)
            
            if cursor.fetchone():
                logger.info("raw_data 表中已存在 library_file_id 字段，跳过添加操作")
            else:
                logger.info("开始为 raw_data 表添加 library_file_id 字段...")
                
                # 添加 library_file_id 字段
                cursor.execute("""
                    ALTER TABLE raw_data 
                    ADD COLUMN library_file_id VARCHAR(36);
                """)
                
                logger.info("✅ 成功添加 library_file_id 字段")
                
                # 创建外键约束（如果 library_files 表存在）
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_name = 'library_files'
                """)
                
                if cursor.fetchone():
                    logger.info("检测到 library_files 表，创建外键约束...")
                    
                    cursor.execute("""
                        ALTER TABLE raw_data 
                        ADD CONSTRAINT fk_raw_data_library_file_id 
                        FOREIGN KEY (library_file_id) 
                        REFERENCES library_files(id);
                    """)
                    
                    logger.info("✅ 成功创建外键约束")
                else:
                    logger.warning("⚠️ library_files 表不存在，跳过外键约束创建")
                
                # 创建索引以提高查询性能
                cursor.execute("""
                    CREATE INDEX idx_raw_data_library_file_id 
                    ON raw_data(library_file_id);
                """)
                
                logger.info("✅ 成功创建索引")
                
            # 提交事务
            self.connection.commit()
            logger.info(f"✅ 迁移 {self.version} 执行成功")
            
        except Exception as e:
            self.connection.rollback()
            logger.error(f"❌ 迁移 {self.version} 执行失败: {str(e)}")
            raise
        finally:
            cursor.close()
            
    def rollback(self):
        """回滚迁移"""
        logger.info(f"开始回滚迁移 {self.version}")
        
        try:
            cursor = self.connection.cursor()
            
            # 检查 raw_data 表是否存在 library_file_id 列
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'raw_data' 
                AND column_name = 'library_file_id'
            """)
            
            if cursor.fetchone():
                logger.info("检测到 raw_data 表中的 library_file_id 字段，开始回滚...")
                
                # 删除索引
                cursor.execute("""
                    DROP INDEX IF EXISTS idx_raw_data_library_file_id;
                """)
                logger.info("✅ 成功删除索引")
                
                # 删除外键约束
                cursor.execute("""
                    ALTER TABLE raw_data 
                    DROP CONSTRAINT IF EXISTS fk_raw_data_library_file_id;
                """)
                logger.info("✅ 成功删除外键约束")
                
                # 删除字段
                cursor.execute("""
                    ALTER TABLE raw_data 
                    DROP COLUMN library_file_id;
                """)
                
                logger.info("✅ 成功删除 library_file_id 字段")
            else:
                logger.info("raw_data 表中不存在 library_file_id 字段，跳过回滚操作")
                
            # 提交事务
            self.connection.commit()
            logger.info(f"✅ 迁移 {self.version} 回滚成功")
            
        except Exception as e:
            self.connection.rollback()
            logger.error(f"❌ 迁移 {self.version} 回滚失败: {str(e)}")
            raise
        finally:
            cursor.close()

def main():
    """主函数"""
    # 数据库连接配置
    DB_CONFIG = {
        'host': 'localhost',
        'database': 'pindata_dataset',
        'user': 'postgres',
        'password': 'postgres',
        'port': 5432
    }
    
    connection = None
    try:
        # 连接数据库
        connection = psycopg2.connect(**DB_CONFIG)
        logger.info("数据库连接成功")
        
        # 执行迁移
        migration = AddLibraryFileIdToRawDataV1_0_11(connection)
        migration.migrate()
        
    except Exception as e:
        logger.error(f"迁移执行失败: {str(e)}")
        return False
    finally:
        if connection:
            connection.close()
            logger.info("数据库连接已关闭")
    
    return True

if __name__ == '__main__':
    success = main()
    if not success:
        exit(1)