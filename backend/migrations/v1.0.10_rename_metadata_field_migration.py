#!/usr/bin/env python3
"""
数据库迁移脚本 - v1.0.10
重命名 datasets 表中的 metadata 字段为 meta_data 以避免与 SQLAlchemy 保留字冲突
"""

import logging
import psycopg2
from datetime import datetime

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class DatasetMetadataRenameV1_0_10:
    """重命名数据集元数据字段迁移类"""
    
    def __init__(self, connection):
        self.connection = connection
        self.version = 'v1.0.10'
        
    def migrate(self):
        """执行迁移"""
        logger.info(f"开始执行迁移 {self.version}")
        
        try:
            cursor = self.connection.cursor()
            
            # 检查 datasets 表是否存在 metadata 列
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'datasets' 
                AND column_name = 'metadata'
            """)
            
            if cursor.fetchone():
                logger.info("检测到 datasets 表中的 metadata 字段，开始重命名...")
                
                # 重命名 metadata 字段为 meta_data
                cursor.execute("""
                    ALTER TABLE datasets 
                    RENAME COLUMN metadata TO meta_data;
                """)
                
                logger.info("✅ 成功将 datasets.metadata 字段重命名为 meta_data")
            else:
                logger.info("datasets 表中不存在 metadata 字段，跳过重命名操作")
                
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
            
            # 检查 datasets 表是否存在 meta_data 列
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'datasets' 
                AND column_name = 'meta_data'
            """)
            
            if cursor.fetchone():
                logger.info("检测到 datasets 表中的 meta_data 字段，开始回滚重命名...")
                
                # 将 meta_data 字段重命名回 metadata
                cursor.execute("""
                    ALTER TABLE datasets 
                    RENAME COLUMN meta_data TO metadata;
                """)
                
                logger.info("✅ 成功将 datasets.meta_data 字段回滚为 metadata")
            else:
                logger.info("datasets 表中不存在 meta_data 字段，跳过回滚操作")
                
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
        migration = DatasetMetadataRenameV1_0_10(connection)
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