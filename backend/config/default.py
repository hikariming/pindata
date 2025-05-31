'''
默认应用配置
'''

# 这是一个 Python 文件，可以直接定义配置变量
# 或者返回一个配置字典

# def get_config():
#     return {
#         "SECRET_KEY": "your_default_secret_key_here",
#         "DEBUG": False,
#         "TESTING": False,
        
#         # 数据库配置 (示例, 实际应从环境变量读取敏感信息)
#         "SQLALCHEMY_DATABASE_URI": "postgresql://user:password@localhost/mydatabase",
#         "SQLALCHEMY_TRACK_MODIFICATIONS": False,
        
#         # MinIO 配置 (示例)
#         "MINIO_ENDPOINT": "localhost:9000",
#         "MINIO_ACCESS_KEY": "minioadmin",
#         "MINIO_SECRET_KEY": "minioadmin",
#         "MINIO_SECURE": False, # True if using HTTPS
        
#         # Celery 配置 (示例)
#         "CELERY_BROKER_URL": "redis://localhost:6379/0",
#         "CELERY_RESULT_BACKEND": "redis://localhost:6379/0",
        
#         # 应用特定配置
#         "DEFAULT_PLUGIN_PATH": "app/plugins/core",
#         "CUSTOM_PLUGIN_PATH": "plugins/custom"
#     }

# 或者直接定义变量 (Flask 更常见的方式)
SECRET_KEY = "change_this_to_a_very_secret_key_in_production_or_env"
DEBUG = False
TESTING = False

# 数据库配置 (更推荐从环境变量加载，尤其对于敏感信息)
SQLALCHEMY_DATABASE_URI = "postgresql://user:password@db_host:5432/llama_dataset_db"
SQLALCHEMY_TRACK_MODIFICATIONS = False

# MinIO 配置
MINIO_ENDPOINT = "minio:9000" # Docker Compose 服务名
MINIO_ACCESS_KEY = "MINIO_ROOT_USER" # 从 .env 或 k8s secrets 读取
MINIO_SECRET_KEY = "MINIO_ROOT_PASSWORD" # 从 .env 或 k8s secrets 读取
MINIO_SECURE = False
MINIO_DEFAULT_BUCKET = "datasets"

# Celery 配置
CELERY_BROKER_URL = "redis://redis:6379/0" # Docker Compose 服务名
CELERY_RESULT_BACKEND = "redis://redis:6379/0"

# 插件相关
CORE_PLUGIN_DIR = "app/plugins" # 相对于 app 目录
CUSTOM_PLUGIN_DIR = "../../../plugins" # 相对于 app 目录, 指向项目根目录下的 plugins

print("default.py config loaded (mock)") 