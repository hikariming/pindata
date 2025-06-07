#!/usr/bin/env python3
"""
测试数据集导入功能
"""

import os
import sys
import requests
import time

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_create_dataset():
    """测试创建数据集（导入）"""
    base_url = "http://localhost:5000"
    
    # 测试创建空数据集
    print("=== 测试创建空数据集 ===")
    empty_dataset_data = {
        "name": "test_empty_dataset",
        "owner": "test_user", 
        "description": "测试空数据集",
        "license": "MIT",
        "task_type": "Natural Language Processing",
        "language": "Chinese",
        "featured": False,
        "tags": ["test", "nlp"]
    }
    
    try:
        response = requests.post(f"{base_url}/api/v1/datasets", json=empty_dataset_data)
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        if response.status_code == 201:
            dataset_id = response.json()['id']
            print(f"✅ 空数据集创建成功，ID: {dataset_id}")
        else:
            print("❌ 空数据集创建失败")
            
    except Exception as e:
        print(f"❌ 请求失败: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # 测试从HuggingFace导入数据集
    print("=== 测试从HuggingFace导入数据集 ===")
    hf_dataset_data = {
        "import_method": "huggingface",
        "import_url": "squad"
    }
    
    try:
        response = requests.post(f"{base_url}/api/v1/datasets", json=hf_dataset_data)
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        if response.status_code == 201:
            dataset_id = response.json()['id']
            print(f"✅ HuggingFace数据集导入任务已启动，ID: {dataset_id}")
            
            # 查询导入状态
            time.sleep(2)  # 等待任务启动
            status_response = requests.get(f"{base_url}/api/v1/datasets/{dataset_id}/import-status")
            print(f"导入状态查询结果: {status_response.status_code}")
            if status_response.status_code == 200:
                print(f"导入状态: {status_response.json()}")
            
        else:
            print("❌ HuggingFace数据集导入失败")
            
    except Exception as e:
        print(f"❌ 请求失败: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # 测试从魔搭社区导入数据集
    print("=== 测试从魔搭社区导入数据集 ===")
    ms_dataset_data = {
        "import_method": "modelscope",
        "import_url": "open-r1/Mixture-of-Thoughts"
    }
    
    try:
        response = requests.post(f"{base_url}/api/v1/datasets", json=ms_dataset_data)
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        if response.status_code == 201:
            dataset_id = response.json()['id']
            print(f"✅ 魔搭社区数据集导入任务已启动，ID: {dataset_id}")
            
            # 查询导入状态
            time.sleep(2)  # 等待任务启动
            status_response = requests.get(f"{base_url}/api/v1/datasets/{dataset_id}/import-status")
            print(f"导入状态查询结果: {status_response.status_code}")
            if status_response.status_code == 200:
                print(f"导入状态: {status_response.json()}")
            
        else:
            print("❌ 魔搭社区数据集导入失败")
            
    except Exception as e:
        print(f"❌ 请求失败: {e}")

def test_dataset_list():
    """测试获取数据集列表"""
    base_url = "http://localhost:5000"
    
    print("=== 测试获取数据集列表 ===")
    try:
        response = requests.get(f"{base_url}/api/v1/datasets")
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 获取到 {len(data.get('datasets', []))} 个数据集")
            
            for dataset in data.get('datasets', [])[:3]:  # 只显示前3个
                print(f"  - {dataset['name']} (拥有者: {dataset['owner']})")
        else:
            print("❌ 获取数据集列表失败")
            print(f"响应: {response.text}")
            
    except Exception as e:
        print(f"❌ 请求失败: {e}")

def main():
    print("数据集导入功能测试")
    print("请确保后端服务正在运行在 http://localhost:5000")
    print("="*60)
    
    # 测试获取数据集列表
    test_dataset_list()
    
    print("\n" + "="*60 + "\n")
    
    # 测试创建数据集
    test_create_dataset()
    
    print("\n" + "="*60)
    print("测试完成！")

if __name__ == "__main__":
    main() 