from celery import Celery
from config.config import Config

def make_celery(app_name=__name__):
    """创建并配置Celery实例"""
    celery = Celery(
        app_name,
        backend=Config.CELERY_RESULT_BACKEND,
        broker=Config.CELERY_BROKER_URL
    )
    
    # 配置Celery
    celery.conf.update(
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='UTC',
        enable_utc=True,
        task_track_started=True,
        task_time_limit=30 * 60,  # 30分钟超时
        task_soft_time_limit=25 * 60,  # 25分钟软超时
        worker_prefetch_multiplier=1,
        worker_max_tasks_per_child=1000,
        # 自动发现任务
        include=[
            'app.tasks.conversion_tasks',
            'app.tasks.dataset_import_tasks', 
            'app.tasks.dataset_generation_tasks'
            # 'app.tasks.multimodal_dataset_tasks'  # 暂时移除，功能开发中
        ]
    )
    
    return celery

# 创建全局Celery实例
celery = make_celery('pindata_celery') 