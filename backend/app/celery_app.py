from celery import Celery
from config.config import Config

def make_celery(app_name=__name__):
    """创建并配置Celery实例"""
    celery = Celery(app_name)
    
    # 使用新的配置格式
    celery.conf.update(
        # Broker 和 Backend 配置
        broker_url=Config.CELERY_BROKER_URL,
        result_backend=Config.CELERY_RESULT_BACKEND,
        
        # 序列化配置
        task_serializer=getattr(Config, 'CELERY_TASK_SERIALIZER', 'json'),
        accept_content=getattr(Config, 'CELERY_ACCEPT_CONTENT', ['json']),
        result_serializer=getattr(Config, 'CELERY_RESULT_SERIALIZER', 'json'),
        
        # 时区配置
        timezone=getattr(Config, 'CELERY_TIMEZONE', 'UTC'),
        enable_utc=getattr(Config, 'CELERY_ENABLE_UTC', True),
        
        # 任务配置
        task_track_started=True,
        task_time_limit=30 * 60,  # 30分钟超时
        task_soft_time_limit=25 * 60,  # 25分钟软超时
        
        # Worker 配置
        worker_prefetch_multiplier=1,
        worker_max_tasks_per_child=1000,
        
        # 自动发现任务
        include=[
            'app.tasks.conversion_tasks',
            'app.tasks.dataset_import_tasks', 
            'app.tasks.dataset_generation_tasks',
            'app.tasks.dataflow_tasks',  # 添加DataFlow任务
            'app.tasks.chinese_dataflow_tasks'  # 添加中文DataFlow任务
            # 'app.tasks.multimodal_dataset_tasks'  # 暂时移除，功能开发中
        ]
    )
    
    return celery

# 创建全局Celery实例
celery = make_celery('pindata_celery') 