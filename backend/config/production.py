'''
生产环境特定配置
会覆盖 default.py 中的同名配置
'''

DEBUG = False
TESTING = False

# 生产环境的 SECRET_KEY 应该非常复杂且从环境变量读取
# import os
# SECRET_KEY = os.environ.get('SECRET_KEY', 'fallback_if_not_set_but_should_be_error')

# 生产数据库信息通常从环境变量或配置服务中获取
# SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')

# MinIO 生产配置 (从环境变量或 Vault 等获取)
# MINIO_ENDPOINT = os.environ.get('MINIO_ENDPOINT')
# MINIO_ACCESS_KEY = os.environ.get('MINIO_ACCESS_KEY')
# MINIO_SECRET_KEY = os.environ.get('MINIO_SECRET_KEY')
# MINIO_SECURE = os.environ.get('MINIO_SECURE', 'False').lower() == 'true'

# Celery 生产配置
# CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL')
# CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND')

print("production.py config loaded (mock) - ensure sensitive data is from ENV VARS!") 