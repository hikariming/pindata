"""添加 celery_task_id 字段到 conversion_jobs 表

这个脚本用于手动执行数据库迁移，添加 Celery 任务 ID 字段
"""

from app import create_app
from app.db import db
from sqlalchemy import text

def add_celery_task_id_column():
    """添加 celery_task_id 列到 conversion_jobs 表"""
    app = create_app()
    
    with app.app_context():
        try:
            # 检查列是否已存在
            result = db.session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='conversion_jobs' AND column_name='celery_task_id'
            """))
            
            if result.fetchone() is None:
                # 添加列
                db.session.execute(text("""
                    ALTER TABLE conversion_jobs 
                    ADD COLUMN celery_task_id VARCHAR(255)
                """))
                db.session.commit()
                print("成功添加 celery_task_id 列到 conversion_jobs 表")
            else:
                print("celery_task_id 列已存在")
                
        except Exception as e:
            db.session.rollback()
            print(f"添加列失败: {str(e)}")
            raise

if __name__ == "__main__":
    add_celery_task_id_column() 