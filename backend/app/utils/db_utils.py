import time
import logging
import os
import sys
from functools import wraps
from sqlalchemy import text, inspect
from sqlalchemy.exc import OperationalError, DisconnectionError, ProgrammingError
from app.db import db

logger = logging.getLogger(__name__)

def check_database_connection(app=None, max_retries=3, retry_delay=2):
    """
    检查数据库连接状态
    
    Args:
        app: Flask应用实例，如果在应用上下文外调用则需要提供
        max_retries: 最大重试次数
        retry_delay: 重试间隔（秒）
    
    Returns:
        bool: 连接是否成功
    """
    for attempt in range(max_retries):
        try:
            # 如果提供了app，则使用应用上下文
            if app:
                with app.app_context():
                    db.session.execute(text('SELECT 1'))
                    db.session.commit()
            else:
                # 假设已在应用上下文中
                db.session.execute(text('SELECT 1'))
                db.session.commit()
            
            logger.info("数据库连接检查成功")
            return True
            
        except (OperationalError, DisconnectionError) as e:
            logger.warning(f"数据库连接检查失败 (尝试 {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                logger.error("数据库连接检查最终失败")
                
        except Exception as e:
            logger.error(f"数据库连接检查时发生未知错误: {e}")
            break
    
    return False

def database_retry(max_retries=3, retry_delay=1, exceptions=(OperationalError, DisconnectionError)):
    """
    数据库操作重试装饰器
    
    Args:
        max_retries: 最大重试次数
        retry_delay: 重试间隔（秒）
        exceptions: 需要重试的异常类型
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    logger.warning(f"数据库操作失败 (尝试 {attempt + 1}/{max_retries}): {e}")
                    
                    if attempt < max_retries - 1:
                        # 回滚当前事务
                        try:
                            db.session.rollback()
                        except:
                            pass
                        time.sleep(retry_delay)
                    else:
                        logger.error(f"数据库操作最终失败: {e}")
                        
                except Exception as e:
                    logger.error(f"数据库操作发生未知错误: {e}")
                    raise
            
            # 如果所有重试都失败，抛出最后一个异常
            if last_exception:
                raise last_exception
                
        return wrapper
    return decorator

def get_database_info():
    """
    获取数据库基本信息
    """
    try:
        # 获取数据库版本信息
        result = db.session.execute(text('SELECT version()'))
        version_info = result.scalar()
        
        # 获取当前数据库名称
        result = db.session.execute(text('SELECT current_database()'))
        database_name = result.scalar()
        
        # 获取连接数信息（PostgreSQL）
        try:
            result = db.session.execute(text('''
                SELECT count(*) as active_connections,
                       setting::int as max_connections
                FROM pg_stat_activity, pg_settings 
                WHERE name = 'max_connections'
                GROUP BY setting
            '''))
            conn_info = result.fetchone()
            if conn_info:
                active_connections, max_connections = conn_info
            else:
                active_connections, max_connections = None, None
        except:
            active_connections, max_connections = None, None
        
        return {
            'version': version_info,
            'database_name': database_name,
            'active_connections': active_connections,
            'max_connections': max_connections,
            'status': 'healthy'
        }
        
    except Exception as e:
        logger.error(f"获取数据库信息失败: {e}")
        return {
            'status': 'error',
            'error': str(e)
        }

def ensure_tables_exist():
    """
    确保所有模型对应的表都存在
    """
    try:
        # 导入所有模型以确保它们被注册
        from app.models import (
            dataset, dataset_version, library, library_file,
            conversion_job, conversion_file_detail, task,
            llm_config, system_log, plugin, raw_data
        )
        
        # 创建所有表
        db.create_all()
        
        # 验证关键表是否存在
        key_tables = ['library', 'dataset', 'conversion_job', 'system_log']
        existing_tables = []
        
        for table_name in key_tables:
            try:
                result = db.session.execute(text(f'SELECT 1 FROM {table_name} LIMIT 1'))
                existing_tables.append(table_name)
            except:
                logger.warning(f"表 {table_name} 可能不存在或无法访问")
        
        logger.info(f"验证表存在性完成，可访问的表: {existing_tables}")
        return True
        
    except Exception as e:
        logger.error(f"确保表存在时出错: {e}")
        return False

class DatabaseHealthCheck:
    """数据库健康检查类"""
    
    @staticmethod
    def full_health_check():
        """完整的数据库健康检查"""
        health_status = {
            'overall_status': 'healthy',
            'checks': {
                'connection': False,
                'tables': False,
                'basic_query': False
            },
            'info': {},
            'errors': []
        }
        
        try:
            # 连接检查
            if check_database_connection():
                health_status['checks']['connection'] = True
            else:
                health_status['errors'].append('数据库连接失败')
            
            # 表存在性检查
            if ensure_tables_exist():
                health_status['checks']['tables'] = True
            else:
                health_status['errors'].append('表检查失败')
            
            # 基本查询检查
            try:
                db.session.execute(text('SELECT COUNT(*) FROM system_log'))
                health_status['checks']['basic_query'] = True
            except Exception as e:
                health_status['errors'].append(f'基本查询失败: {e}')
            
            # 获取数据库信息
            health_status['info'] = get_database_info()
            
            # 综合评估
            if not all(health_status['checks'].values()):
                health_status['overall_status'] = 'unhealthy'
            elif health_status['errors']:
                health_status['overall_status'] = 'warning'
                
        except Exception as e:
            health_status['overall_status'] = 'error'
            health_status['errors'].append(f'健康检查异常: {e}')
        
        return health_status 

def is_new_database(engine):
    """
    通过检查关键表（如users）是否存在来判断是否为新数据库
    """
    try:
        inspector = inspect(engine)
        return not inspector.has_table('users')
    except Exception as e:
        logger.error(f"检查数据库状态时出错: {e}")
        # 如果出现异常，保守地认为不是新数据库
        return False

from alembic.config import Config
from alembic import command

def stamp_db_as_latest(app):
    """
    将数据库标记为最新版本，避免执行不必要的迁移
    """
    logger.info("将数据库标记为最新版本...")
    try:
        with app.app_context():
            alembic_cfg = Config("alembic.ini")
            command.stamp(alembic_cfg, "head")
            logger.info("数据库已成功标记为最新版本")
            return True
            
    except Exception as e:
        logger.error(f"标记数据库为最新版本时发生严重错误: {e}")
        return False