#!/usr/bin/env python
"""Celery Worker启动脚本"""
import os
import sys

# 添加项目路径到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.celery_app import celery

# 确保导入所有任务模块
from app.tasks.conversion_tasks import process_conversion_job
from app.tasks.dataset_import_tasks import import_dataset_task
from app.tasks.dataset_generation_tasks import generate_dataset_task
from app.tasks.multimodal_dataset_tasks import generate_multimodal_dataset_task, generate_ai_image_qa_task

if __name__ == '__main__':
    # 启动 Celery Worker
    celery.start() 