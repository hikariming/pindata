import os
from datetime import timedelta
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class Config:
    """基础配置类"""
    # Flask配置
    SECRET_KEY = os.getenv('SECRET_KEY')
    
    # 数据库配置
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # 数据库连接池配置
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': int(os.getenv('DB_POOL_SIZE', '10')),
        'pool_timeout': int(os.getenv('DB_POOL_TIMEOUT', '30')),
        'pool_recycle': int(os.getenv('DB_POOL_RECYCLE', '3600')),
        'max_overflow': int(os.getenv('DB_MAX_OVERFLOW', '20')),
        'pool_pre_ping': os.getenv('DB_POOL_PRE_PING', 'true').lower() == 'true',
        'connect_args': {
            'connect_timeout': int(os.getenv('DB_CONNECT_TIMEOUT', '10')),
        } if os.getenv('DATABASE_URL', '').startswith('postgresql') else {}
    }
    
    # 数据库自动初始化配置
    AUTO_CREATE_DATABASE = os.getenv('AUTO_CREATE_DATABASE', 'true').lower() == 'true'
    DATABASE_INIT_RETRY_COUNT = int(os.getenv('DATABASE_INIT_RETRY_COUNT', '3'))
    DATABASE_INIT_RETRY_DELAY = int(os.getenv('DATABASE_INIT_RETRY_DELAY', '5'))
    
    # 数据库迁移配置
    AUTO_MIGRATE = os.getenv('AUTO_MIGRATE', 'true').lower() == 'true'
    
    # Redis配置
    REDIS_URL = os.getenv('REDIS_URL')
    
    # MinIO配置
    MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT')
    MINIO_ACCESS_KEY = os.getenv('MINIO_ACCESS_KEY')
    MINIO_SECRET_KEY = os.getenv('MINIO_SECRET_KEY')
    MINIO_SECURE = os.getenv('MINIO_SECURE', 'false').lower() == 'true'
    MINIO_BUCKET_NAME = os.getenv('MINIO_BUCKET_NAME')
    MINIO_RAW_DATA_BUCKET = os.getenv('MINIO_RAW_DATA_BUCKET', 'raw-data')
    MINIO_DATASETS_BUCKET = os.getenv('MINIO_DATASETS_BUCKET', 'datasets')
    MINIO_DEFAULT_BUCKET = os.getenv('MINIO_DEFAULT_BUCKET', 'pindata-bucket')
    
    # Celery配置
    CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL')
    CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND')
    CELERY_TASK_SERIALIZER = os.getenv('CELERY_TASK_SERIALIZER')
    CELERY_RESULT_SERIALIZER = os.getenv('CELERY_RESULT_SERIALIZER')
    CELERY_ACCEPT_CONTENT = [os.getenv('CELERY_ACCEPT_CONTENT')]
    CELERY_TIMEZONE = os.getenv('CELERY_TIMEZONE')
    CELERY_ENABLE_UTC = os.getenv('CELERY_ENABLE_UTC', 'true').lower() == 'true'
    
    # API配置
    API_PREFIX = os.getenv('API_PREFIX')
    PAGINATION_PAGE_SIZE = int(os.getenv('PAGINATION_PAGE_SIZE'))
    
    # JWT配置
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES')))
    
    # CORS配置
    CORS_ORIGINS = os.getenv('CORS_ORIGINS')
    
    # 文件上传配置
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH'))
    ALLOWED_EXTENSIONS = set(os.getenv('ALLOWED_EXTENSIONS').split(','))
    
    # 健康检查配置
    HEALTH_CHECK_ENABLED = os.getenv('HEALTH_CHECK_ENABLED', 'true').lower() == 'true'

class DevelopmentConfig(Config):
    """开发环境配置"""
    DEBUG = True
    TESTING = False
    
    # 开发环境使用更小的连接池
    SQLALCHEMY_ENGINE_OPTIONS = {
        **Config.SQLALCHEMY_ENGINE_OPTIONS,
        'pool_size': 5,
        'max_overflow': 10
    }

class TestingConfig(Config):
    """测试环境配置"""
    DEBUG = False
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    
    # 测试环境关闭自动创建数据库
    AUTO_CREATE_DATABASE = False
    
    # 测试环境使用最小连接池
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 1,
        'max_overflow': 0,
        'pool_pre_ping': False
    }

class ProductionConfig(Config):
    """生产环境配置"""
    DEBUG = False
    TESTING = False
    
    # 生产环境使用更大的连接池
    SQLALCHEMY_ENGINE_OPTIONS = {
        **Config.SQLALCHEMY_ENGINE_OPTIONS,
        'pool_size': int(os.getenv('DB_POOL_SIZE', '20')),
        'max_overflow': int(os.getenv('DB_MAX_OVERFLOW', '40'))
    }

# 配置映射
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

def get_config(env_name: str = None):
    """获取配置对象"""
    if env_name is None:
        env_name = os.getenv('FLASK_ENV', 'development')
    return config.get(env_name, config['default']) 