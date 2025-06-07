from flask import jsonify
from flasgger import swag_from
from app.api.v1 import api_v1
from app.models import Dataset, Task, Plugin, RawData, SystemLog, Library
from app.models.task import TaskStatus, TaskType
from app.models.system_log import LogLevel
from app.db import db
from sqlalchemy import func, desc
from datetime import datetime, timedelta

@api_v1.route('/overview/stats', methods=['GET'])
@swag_from({
    'tags': ['概览'],
    'summary': '获取系统统计信息',
    'responses': {
        200: {
            'description': '成功获取统计信息'
        }
    }
})
def get_stats():
    """获取系统统计信息"""
    dataset_count = db.session.query(Dataset).count()
    task_count = db.session.query(Task).count()
    
    # 获取任务状态统计
    completed_tasks = db.session.query(Task).filter(Task.status == TaskStatus.COMPLETED).count()
    running_tasks = db.session.query(Task).filter(Task.status == TaskStatus.RUNNING).count()
    failed_tasks = db.session.query(Task).filter(Task.status == TaskStatus.FAILED).count()
    
    # 获取文件库统计
    library_count = db.session.query(Library).count()
    
    # 计算存储使用情况（基于文件库的实际大小）
    storage_stats = db.session.query(func.sum(Library.total_size)).scalar() or 0
    storage_total = 1024 * 1024 * 1024 * 1024  # 1TB
    
    # 获取文件统计
    total_files = db.session.query(func.sum(Library.file_count)).scalar() or 0
    processed_files = db.session.query(func.sum(Library.processed_count)).scalar() or 0
    
    return jsonify({
        'datasets': {
            'total': dataset_count
        },
        'tasks': {
            'total': task_count,
            'completed': completed_tasks,
            'running': running_tasks,
            'failed': failed_tasks
        },
        'plugins': {
            'total': 0,  # 插件功能暂未实现
            'status': 'coming_soon'
        },
        'storage': {
            'used': storage_stats,
            'total': storage_total,
            'used_gb': round(storage_stats / (1024**3), 2),
            'total_gb': round(storage_total / (1024**3), 2),
            'libraries': library_count
        },
        'files': {
            'total': total_files,
            'processed': processed_files
        }
    })

@api_v1.route('/overview/recent-activities', methods=['GET'])
@swag_from({
    'tags': ['概览'],
    'summary': '获取最近活动',
    'responses': {
        200: {
            'description': '成功获取最近活动'
        }
    }
})
def get_recent_activities():
    """获取最近活动"""
    activities = []
    
    # 获取最近的任务作为活动
    recent_tasks = db.session.query(Task)\
        .order_by(desc(Task.created_at))\
        .limit(3)\
        .all()
    
    for task in recent_tasks:
        time_diff = datetime.utcnow() - task.created_at
        if time_diff.total_seconds() < 3600:
            time_str = f"{int(time_diff.total_seconds() // 60)} minutes ago"
        elif time_diff.days < 1:
            time_str = f"{int(time_diff.total_seconds() // 3600)} hours ago"
        else:
            time_str = f"{time_diff.days} days ago"
        
        # 根据任务状态设置标题
        status_text = {
            TaskStatus.COMPLETED: "completed",
            TaskStatus.RUNNING: "is running",
            TaskStatus.FAILED: "failed",
            TaskStatus.PENDING: "is pending",
            TaskStatus.CANCELLED: "was cancelled"
        }.get(task.status, "updated")
        
        activities.append({
            'id': f"task-{task.id}",
            'title': f"Task '{task.name}' {status_text}",
            'time': time_str,
            'type': task.status.value if task.status else 'info',
            'icon': 'task'
        })
    
    # 获取最近的数据集
    recent_datasets = db.session.query(Dataset)\
        .order_by(desc(Dataset.updated_at))\
        .limit(2)\
        .all()
    
    for dataset in recent_datasets:
        time_diff = datetime.utcnow() - dataset.updated_at
        if time_diff.total_seconds() < 3600:
            time_str = f"{int(time_diff.total_seconds() // 60)} minutes ago"
        elif time_diff.days < 1:
            time_str = f"{int(time_diff.total_seconds() // 3600)} hours ago"
        else:
            time_str = f"{time_diff.days} days ago"
            
        activities.append({
            'id': f"dataset-{dataset.id}",
            'title': f"Dataset '{dataset.name}' updated",
            'time': time_str,
            'type': 'info',
            'icon': 'database'
        })
    
    # 如果没有真实数据，添加一些默认活动
    if len(activities) == 0:
        activities = [
            {
                'id': 'default-1',
                'title': "Welcome to pindata!",
                'time': "just now",
                'type': 'info',
                'icon': 'database'
            },
            {
                'id': 'default-2', 
                'title': "System initialized successfully",
                'time': "1 minute ago",
                'type': 'success',
                'icon': 'task'
            }
        ]
    
    # 按时间排序并限制为5个
    sorted_activities = sorted(activities, key=lambda x: x['time'], reverse=False)
    
    return jsonify({
        'activities': sorted_activities[:5]
    })

@api_v1.route('/overview/notifications', methods=['GET'])
@swag_from({
    'tags': ['概览'],
    'summary': '获取系统通知',
    'responses': {
        200: {
            'description': '成功获取系统通知'
        }
    }
})
def get_notifications():
    """获取系统通知"""
    notifications = []
    
    try:
        # 尝试获取最近的重要系统日志作为通知
        recent_logs = db.session.query(SystemLog)\
            .filter(SystemLog.level.in_([LogLevel.WARN, LogLevel.ERROR, LogLevel.INFO]))\
            .order_by(desc(SystemLog.created_at))\
            .limit(2)\
            .all()
        
        for log in recent_logs:
            time_diff = datetime.utcnow() - log.created_at
            if time_diff.total_seconds() < 3600:
                time_str = f"{int(time_diff.total_seconds() // 60)} minutes ago"
            elif time_diff.days < 1:
                time_str = f"{int(time_diff.total_seconds() // 3600)} hours ago"
            else:
                time_str = f"{time_diff.days} days ago"
                
            notifications.append({
                'id': log.id,
                'title': log.message,
                'time': time_str,
                'type': log.level.value if log.level else 'info',
                'icon': 'database' if 'dataset' in log.message.lower() else 'system'
            })
    except Exception as e:
        print(f"Error fetching system logs: {e}")
    
    # 获取最近完成的任务作为通知
    try:
        completed_tasks = db.session.query(Task)\
            .filter(Task.status == TaskStatus.COMPLETED)\
            .order_by(desc(Task.completed_at))\
            .limit(2)\
            .all()
        
        for task in completed_tasks:
            if task.completed_at:
                time_diff = datetime.utcnow() - task.completed_at
                if time_diff.total_seconds() < 3600:
                    time_str = f"{int(time_diff.total_seconds() // 60)} minutes ago"
                elif time_diff.days < 1:
                    time_str = f"{int(time_diff.total_seconds() // 3600)} hours ago"
                else:
                    time_str = f"{time_diff.days} days ago"
                    
                notifications.append({
                    'id': f"task-notify-{task.id}",
                    'title': f"Task '{task.name}' completed successfully",
                    'time': time_str,
                    'type': 'success',
                    'icon': 'task'
                })
    except Exception as e:
        print(f"Error fetching completed tasks: {e}")
    
    # 如果没有真实通知，添加默认通知
    if len(notifications) == 0:
        notifications = [
            {
                'id': 'default-notify-1',
                'title': "Welcome to pindata!",
                'time': "just now",
                'type': 'info',
                'icon': 'system'
            },
            {
                'id': 'default-notify-2',
                'title': "System is ready for data processing",
                'time': "1 minute ago",
                'type': 'success',
                'icon': 'database'
            }
        ]
    
    return jsonify({
        'notifications': notifications[:2]
    })

@api_v1.route('/health', methods=['GET'])
@swag_from({
    'tags': ['系统'],
    'summary': '健康检查',
    'responses': {
        200: {
            'description': '系统正常运行'
        }
    }
})
def health_check():
    """健康检查端点"""
    return jsonify({
        'status': 'healthy',
        'service': 'pindata API'
    }) 