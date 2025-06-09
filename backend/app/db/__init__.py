from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import create_engine, text
from urllib.parse import urlparse
import os
import logging

logger = logging.getLogger(__name__)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

def ensure_database_exists(database_url):
    """
    确保数据库存在，如果不存在则创建
    适用于PostgreSQL和MySQL
    """
    try:
        # 解析数据库URL
        parsed = urlparse(database_url)
        
        if not parsed.scheme:
            logger.warning("无效的数据库URL格式")
            return False
            
        # 提取数据库信息
        host = parsed.hostname
        port = parsed.port
        username = parsed.username
        password = parsed.password
        db_name = parsed.path.lstrip('/')
        
        if parsed.scheme.startswith('postgresql'):
            return _ensure_postgresql_database(host, port, username, password, db_name)
        elif parsed.scheme.startswith('mysql'):
            return _ensure_mysql_database(host, port, username, password, db_name)
        elif parsed.scheme.startswith('sqlite'):
            # SQLite会自动创建文件，无需特殊处理
            return True
        else:
            logger.info(f"不支持的数据库类型: {parsed.scheme}")
            return False
            
    except Exception as e:
        logger.error(f"检查数据库存在性时出错: {e}")
        return False

def _ensure_postgresql_database(host, port, username, password, db_name):
    """确保PostgreSQL数据库存在"""
    try:
        # 构建连接到postgres系统数据库的URL
        admin_url = f"postgresql://{username}:{password}@{host}:{port or 5432}/postgres"
        
        # 创建引擎连接到系统数据库
        admin_engine = create_engine(admin_url, isolation_level='AUTOCOMMIT')
        
        with admin_engine.connect() as conn:
            # 检查数据库是否存在
            result = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :db_name"),
                {"db_name": db_name}
            )
            
            if not result.fetchone():
                # 数据库不存在，创建它
                logger.info(f"创建PostgreSQL数据库: {db_name}")
                conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                logger.info(f"成功创建数据库: {db_name}")
            else:
                logger.info(f"数据库 {db_name} 已存在")
                
        admin_engine.dispose()
        return True
        
    except Exception as e:
        logger.error(f"创建PostgreSQL数据库失败: {e}")
        return False

def _ensure_mysql_database(host, port, username, password, db_name):
    """确保MySQL数据库存在"""
    try:
        # 构建连接到MySQL系统的URL
        admin_url = f"mysql://{username}:{password}@{host}:{port or 3306}/mysql"
        
        # 创建引擎连接到系统数据库
        admin_engine = create_engine(admin_url)
        
        with admin_engine.connect() as conn:
            # 检查数据库是否存在
            result = conn.execute(
                text("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = :db_name"),
                {"db_name": db_name}
            )
            
            if not result.fetchone():
                # 数据库不存在，创建它
                logger.info(f"创建MySQL数据库: {db_name}")
                conn.execute(text(f'CREATE DATABASE `{db_name}`'))
                logger.info(f"成功创建数据库: {db_name}")
            else:
                logger.info(f"数据库 {db_name} 已存在")
                
        admin_engine.dispose()
        return True
        
    except Exception as e:
        logger.error(f"创建MySQL数据库失败: {e}")
        return False

def init_database(app):
    """
    初始化数据库，包括创建数据库和表
    """
    try:
        database_url = app.config.get('SQLALCHEMY_DATABASE_URI')
        
        if not database_url:
            logger.error("未配置数据库URL")
            return False
            
        # 确保数据库存在
        if ensure_database_exists(database_url):
            logger.info("数据库检查完成")
        else:
            logger.warning("数据库检查失败，尝试继续...")
            
        # 创建所有表
        with app.app_context():
            try:
                db.create_all()
                logger.info("数据库表创建/更新成功")
                return True
            except Exception as e:
                logger.error(f"创建数据库表失败: {e}")
                return False
                
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
        return False 