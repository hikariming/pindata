#!/usr/bin/env python3
import os
import sys
from minio import Minio
from minio.error import S3Error

def check_minio_buckets():
    """检查MinIO中的buckets和文件"""
    try:
        # MinIO客户端配置
        client = Minio(
            'localhost:9000',
            access_key='minioadmin',
            secret_key='minioadmin',
            secure=False
        )
        
        print("=== MinIO Buckets 检查 ===")
        
        # 列出所有buckets
        buckets = client.list_buckets()
        print(f"找到 {len(buckets)} 个buckets:")
        for bucket in buckets:
            print(f"  - {bucket.name} (创建时间: {bucket.creation_date})")
        
        # 检查特定文件在各个bucket中的位置
        target_object = "6fcee5dc-b934-40e4-91bd-1ffaeadd3f15/648bada0ea254cf48cb69f3d045b5755.docx"
        print(f"\n=== 搜索文件: {target_object} ===")
        
        for bucket in buckets:
            try:
                # 检查对象是否存在
                client.stat_object(bucket.name, target_object)
                print(f"✅ 文件在 bucket '{bucket.name}' 中找到!")
                return bucket.name
            except S3Error as e:
                if e.code == 'NoSuchKey':
                    print(f"❌ 文件不在 bucket '{bucket.name}' 中")
                else:
                    print(f"⚠️  检查 bucket '{bucket.name}' 时出错: {e}")
        
        # 如果没有找到文件，尝试列出包含该库ID的文件
        library_id = "6fcee5dc-b934-40e4-91bd-1ffaeadd3f15"
        print(f"\n=== 搜索库 {library_id} 的所有文件 ===")
        
        for bucket in buckets:
            try:
                objects = client.list_objects(bucket.name, prefix=library_id, recursive=True)
                files_found = list(objects)
                if files_found:
                    print(f"在 bucket '{bucket.name}' 中找到 {len(files_found)} 个文件:")
                    for obj in files_found:
                        print(f"  - {obj.object_name}")
            except Exception as e:
                print(f"列出 bucket '{bucket.name}' 中的对象时出错: {e}")
        
        return None
                
    except Exception as e:
        print(f"连接MinIO时出错: {e}")
        return None

if __name__ == "__main__":
    check_minio_buckets()