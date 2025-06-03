#!/usr/bin/env python
"""
迁移文件到正确的bucket
检查数据库中的文件记录，尝试从各种可能的bucket中迁移文件到raw-data
"""

import os
from minio import Minio
from minio.error import S3Error
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def migrate_files():
    """迁移文件到正确的bucket"""
    # 配置
    endpoint = os.getenv('MINIO_ENDPOINT', 'localhost:9000')
    access_key = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
    secret_key = os.getenv('MINIO_SECRET_KEY', 'minioadmin')
    secure = os.getenv('MINIO_SECURE', 'false').lower() == 'true'
    main_bucket = os.getenv('MINIO_BUCKET_NAME', 'llama-dataset')
    target_bucket = 'raw-data'
    
    try:
        # 创建MinIO客户端
        client = Minio(
            endpoint=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure
        )
        
        print(f"连接到MinIO: {endpoint}")
        
        # 获取所有bucket
        buckets = client.list_buckets()
        bucket_names = [bucket.name for bucket in buckets]
        print(f"发现的buckets: {bucket_names}")
        
        # 确保目标bucket存在
        if target_bucket not in bucket_names:
            print(f"创建目标bucket: {target_bucket}")
            client.make_bucket(target_bucket)
        
        # 可能的源bucket列表
        possible_buckets = [main_bucket, '3', 'raw-data'] + bucket_names
        possible_buckets = list(set(possible_buckets))  # 去重
        
        migrated_count = 0
        error_count = 0
        
        # 从数据库获取文件列表
        from app import create_app
        from app.models import LibraryFile
        from app.db import db
        
        app = create_app()
        with app.app_context():
            files = LibraryFile.query.all()
            print(f"数据库中找到 {len(files)} 个文件记录")
            
            for file in files:
                print(f"\n处理文件: {file.original_filename}")
                print(f"  数据库中的object_name: {file.minio_object_name}")
                print(f"  数据库中的bucket: {file.minio_bucket}")
                
                # 检查文件是否已经在正确位置
                try:
                    client.stat_object(target_bucket, file.minio_object_name)
                    print(f"  ✅ 文件已在目标bucket中")
                    # 更新数据库记录
                    file.minio_bucket = target_bucket
                    db.session.commit()
                    continue
                except S3Error:
                    pass
                
                # 尝试从各个可能的bucket中找到文件
                found = False
                for source_bucket in possible_buckets:
                    if source_bucket == target_bucket:
                        continue
                        
                    try:
                        if source_bucket not in bucket_names:
                            continue
                            
                        print(f"  尝试从 {source_bucket} 中寻找文件...")
                        
                        # 检查文件是否存在
                        client.stat_object(source_bucket, file.minio_object_name)
                        print(f"  📁 在 {source_bucket} 中找到文件")
                        
                        # 复制文件到目标bucket
                        from minio.commonconfig import CopySource
                        copy_source = CopySource(source_bucket, file.minio_object_name)
                        client.copy_object(target_bucket, file.minio_object_name, copy_source)
                        print(f"  🔄 已复制到 {target_bucket}")
                        
                        # 删除源文件
                        client.remove_object(source_bucket, file.minio_object_name)
                        print(f"  🗑️  已从 {source_bucket} 删除")
                        
                        # 更新数据库记录
                        file.minio_bucket = target_bucket
                        db.session.commit()
                        print(f"  📝 已更新数据库记录")
                        
                        migrated_count += 1
                        found = True
                        break
                        
                    except S3Error as e:
                        if "NoSuchKey" not in str(e):
                            print(f"  ❌ 从 {source_bucket} 检查文件时出错: {e}")
                        continue
                    except Exception as e:
                        print(f"  ❌ 迁移文件时出错: {e}")
                        continue
                
                if not found:
                    print(f"  ❌ 在任何bucket中都找不到文件")
                    error_count += 1
        
        print(f"\n📊 迁移完成:")
        print(f"  成功迁移: {migrated_count} 个文件")
        print(f"  未找到文件: {error_count} 个文件")
        
        return error_count == 0
        
    except Exception as e:
        print(f"❌ 迁移失败: {e}")
        return False

if __name__ == "__main__":
    success = migrate_files()
    exit(0 if success else 1) 