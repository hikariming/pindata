#!/usr/bin/env python
"""
设置MinIO存储桶
检查并创建必要的bucket
"""

import os
from minio import Minio
from minio.error import S3Error
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def setup_minio():
    """设置MinIO存储桶"""
    # 配置
    endpoint = os.getenv('MINIO_ENDPOINT', 'localhost:9000')
    access_key = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
    secret_key = os.getenv('MINIO_SECRET_KEY', 'minioadmin')
    secure = os.getenv('MINIO_SECURE', 'false').lower() == 'true'
    bucket_name = os.getenv('MINIO_BUCKET_NAME', 'llama-dataset')
    
    print(f"连接到MinIO: {endpoint}")
    print(f"使用访问密钥: {access_key}")
    print(f"安全连接: {secure}")
    print(f"目标bucket: {bucket_name}")
    
    try:
        # 创建MinIO客户端
        client = Minio(
            endpoint=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure
        )
        
        # 检查连接
        try:
            buckets = client.list_buckets()
            print(f"成功连接到MinIO，当前存在的buckets:")
            for bucket in buckets:
                print(f"  - {bucket.name} (创建时间: {bucket.creation_date})")
        except Exception as e:
            print(f"连接MinIO失败: {e}")
            return False
        
        # 检查并创建主bucket
        if not client.bucket_exists(bucket_name):
            print(f"创建bucket: {bucket_name}")
            client.make_bucket(bucket_name)
            print(f"✅ 成功创建bucket: {bucket_name}")
        else:
            print(f"✅ Bucket {bucket_name} 已存在")
        
        # 检查并创建raw-data bucket (如果配置中的bucket不是raw-data)
        if bucket_name != 'raw-data':
            if not client.bucket_exists('raw-data'):
                print(f"创建bucket: raw-data")
                client.make_bucket('raw-data')
                print(f"✅ 成功创建bucket: raw-data")
            else:
                print(f"✅ Bucket raw-data 已存在")
        
        # 测试上传下载
        test_content = "测试文件内容"
        test_object = "test/test.txt"
        test_bytes = test_content.encode('utf-8')
        
        print(f"测试上传文件到 {bucket_name}...")
        from io import BytesIO
        client.put_object(
            bucket_name, 
            test_object, 
            BytesIO(test_bytes),
            len(test_bytes),
            content_type='text/plain'
        )
        print("✅ 测试上传成功")
        
        print("测试下载文件...")
        response = client.get_object(bucket_name, test_object)
        downloaded_content = response.data.decode('utf-8')
        if downloaded_content == test_content:
            print("✅ 测试下载成功")
        else:
            print("❌ 测试下载失败: 内容不匹配")
            return False
        
        # 清理测试文件
        client.remove_object(bucket_name, test_object)
        print("✅ 清理测试文件成功")
        
        print("\n🎉 MinIO设置完成!")
        return True
        
    except S3Error as e:
        print(f"❌ MinIO操作失败: {e}")
        return False
    except Exception as e:
        print(f"❌ 设置失败: {e}")
        return False

if __name__ == "__main__":
    success = setup_minio()
    exit(0 if success else 1) 