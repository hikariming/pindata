#!/usr/bin/env python
"""
修复数据库中错误的MinIO bucket名称
将所有library_files表中的minio_bucket字段更新为'raw-data'
"""

from app import create_app
from app.models import LibraryFile
from app.db import db

def fix_bucket_names():
    """修复bucket名称"""
    app = create_app()
    with app.app_context():
        # 查找所有minio_bucket不是'raw-data'的记录
        incorrect_files = LibraryFile.query.filter(
            LibraryFile.minio_bucket != 'raw-data'
        ).all()
        
        print(f"找到 {len(incorrect_files)} 个需要修复的文件记录")
        
        for file in incorrect_files:
            print(f"修复文件 {file.id}: {file.original_filename}, 原bucket: {file.minio_bucket}")
            file.minio_bucket = 'raw-data'
        
        # 提交更改
        db.session.commit()
        print("所有文件记录已修复完成")

if __name__ == "__main__":
    fix_bucket_names() 