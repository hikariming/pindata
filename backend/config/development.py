'''
开发环境特定配置
会覆盖 default.py 中的同名配置
'''

DEBUG = True

# 开发环境数据库 (例如，本地 Docker 中的 PostgreSQL)
SQLALCHEMY_DATABASE_URI = "postgresql://dev_user:dev_password@localhost:5432/llama_dev_db"

# 开发时可以直接使用 MinIO 的 root 用户，或者特定开发用户
MINIO_ACCESS_KEY = "minioadmin"
MINIO_SECRET_KEY = "minioadmin"
MINIO_ENDPOINT = "localhost:9000"

# Celery 在开发时可以配置为同步执行，方便调试
# CELERY_TASK_ALWAYS_EAGER = True
# CELERY_TASK_EAGER_PROPAGATES = True

print("development.py config loaded (mock)") 