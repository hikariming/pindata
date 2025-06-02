#!/usr/bin/env python
"""
测试MinIO配置和bucket设置
"""
import os
from minio import Minio
from minio.error import S3Error
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def test_minio_setup():
    """测试MinIO配置"""
    # 配置
    endpoint = os.getenv('MINIO_ENDPOINT', 'localhost:9000')
    access_key = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
    secret_key = os.getenv('MINIO_SECRET_KEY', 'minioadmin')
    secure = os.getenv('MINIO_SECURE', 'false').lower() == 'true'
    
    try:
        # 创建MinIO客户端
        client = Minio(
            endpoint=endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure
        )
        
        print(f"✅ 连接到MinIO: {endpoint}")
        
        # 获取所有bucket
        buckets = client.list_buckets()
        bucket_names = [bucket.name for bucket in buckets]
        print(f"📁 现有buckets: {bucket_names}")
        
        # 检查raw-data bucket
        raw_data_exists = client.bucket_exists('raw-data')
        print(f"🔍 raw-data bucket存在: {raw_data_exists}")
        
        # 如果不存在，创建它
        if not raw_data_exists:
            print("🆕 创建raw-data bucket...")
            client.make_bucket('raw-data')
            print("✅ raw-data bucket创建成功")
        
        # 测试文件操作
        test_content = "测试文件内容"
        test_object = "test/upload_download_test.txt"
        test_bytes = test_content.encode('utf-8')
        
        print(f"📤 测试上传文件到raw-data bucket...")
        from io import BytesIO
        client.put_object(
            'raw-data', 
            test_object, 
            BytesIO(test_bytes),
            len(test_bytes),
            content_type='text/plain'
        )
        print("✅ 测试上传成功")
        
        print("📥 测试下载文件...")
        response = client.get_object('raw-data', test_object)
        downloaded_content = response.data.decode('utf-8')
        if downloaded_content == test_content:
            print("✅ 测试下载成功")
        else:
            print("❌ 测试下载失败: 内容不匹配")
            return False
        
        # 清理测试文件
        client.remove_object('raw-data', test_object)
        print("🧹 清理测试文件成功")
        
        print("\n🎉 MinIO配置测试通过!")
        return True
        
    except S3Error as e:
        print(f"❌ MinIO操作失败: {e}")
        return False
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

if __name__ == "__main__":
    test_minio_setup() 