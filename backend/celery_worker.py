#!/usr/bin/env python
"""Celery Worker启动脚本"""
import os
import sys

# 添加项目路径到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.celery_app import celery
from app.tasks import *  # 导入所有任务

if __name__ == '__main__':
    # 启动 Celery Worker
    celery.start() 