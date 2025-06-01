#!/usr/bin/env python3
"""
文件库API测试脚本
"""

import requests
import json
import uuid
from datetime import datetime

# 配置
BASE_URL = "http://localhost:8897/api/v1"

def test_library_crud():
    """测试文件库CRUD操作"""
    print("开始测试文件库CRUD操作...")
    
    # 1. 获取统计信息
    print("\n1. 获取统计信息")
    response = requests.get(f"{BASE_URL}/libraries/statistics")
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
    
    # 2. 创建文件库
    print("\n2. 创建文件库")
    library_data = {
        "name": f"测试文件库_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "description": "这是一个测试文件库",
        "data_type": "training",
        "tags": ["测试", "API", "文档"]
    }
    
    response = requests.post(f"{BASE_URL}/libraries", json=library_data)
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
    
    if response.status_code == 201:
        library_id = response.json()['data']['id']
        print(f"创建的文件库ID: {library_id}")
        
        # 3. 获取文件库详情
        print("\n3. 获取文件库详情")
        response = requests.get(f"{BASE_URL}/libraries/{library_id}")
        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
        
        # 4. 更新文件库
        print("\n4. 更新文件库")
        update_data = {
            "description": "更新后的文件库描述",
            "tags": ["测试", "API", "更新"]
        }
        response = requests.put(f"{BASE_URL}/libraries/{library_id}", json=update_data)
        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
        
        # 5. 获取文件库列表
        print("\n5. 获取文件库列表")
        response = requests.get(f"{BASE_URL}/libraries?page=1&per_page=10")
        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
        
        # 6. 获取文件库中的文件列表
        print("\n6. 获取文件库中的文件列表")
        response = requests.get(f"{BASE_URL}/libraries/{library_id}/files")
        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
        
        # 7. 删除文件库
        print("\n7. 删除文件库")
        response = requests.delete(f"{BASE_URL}/libraries/{library_id}")
        print(f"状态码: {response.status_code}")
        print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
        
    else:
        print("文件库创建失败，跳过后续测试")

def test_library_list_with_filters():
    """测试文件库列表的过滤和排序"""
    print("\n\n开始测试文件库列表过滤和排序...")
    
    # 测试各种查询参数
    test_params = [
        {},  # 默认参数
        {"page": 1, "per_page": 5},  # 分页
        {"sort_by": "name", "sort_order": "asc"},  # 按名称升序
        {"data_type": "training"},  # 按数据类型过滤
        {"name": "测试"},  # 按名称模糊搜索
    ]
    
    for i, params in enumerate(test_params, 1):
        print(f"\n{i}. 测试参数: {params}")
        response = requests.get(f"{BASE_URL}/libraries", params=params)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"返回数据量: {len(data.get('data', []))}")
            if 'pagination' in data:
                print(f"分页信息: {data['pagination']}")
        else:
            print(f"错误响应: {response.text}")

def test_error_cases():
    """测试错误情况"""
    print("\n\n开始测试错误情况...")
    
    # 1. 获取不存在的文件库
    print("\n1. 获取不存在的文件库")
    fake_id = str(uuid.uuid4())
    response = requests.get(f"{BASE_URL}/libraries/{fake_id}")
    print(f"状态码: {response.status_code}")
    print(f"响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
    
    # 2. 创建重复名称的文件库
    print("\n2. 创建重复名称的文件库")
    duplicate_data = {
        "name": "重复测试文件库",
        "description": "第一个",
        "data_type": "training"
    }
    
    # 先创建一个
    response1 = requests.post(f"{BASE_URL}/libraries", json=duplicate_data)
    print(f"第一次创建状态码: {response1.status_code}")
    
    if response1.status_code == 201:
        library_id = response1.json()['data']['id']
        
        # 再创建相同名称的
        response2 = requests.post(f"{BASE_URL}/libraries", json=duplicate_data)
        print(f"第二次创建状态码: {response2.status_code}")
        print(f"错误响应: {json.dumps(response2.json(), ensure_ascii=False, indent=2)}")
        
        # 清理
        requests.delete(f"{BASE_URL}/libraries/{library_id}")
    
    # 3. 无效的数据类型
    print("\n3. 无效的数据类型")
    invalid_data = {
        "name": "无效数据类型测试",
        "data_type": "invalid_type"
    }
    response = requests.post(f"{BASE_URL}/libraries", json=invalid_data)
    print(f"状态码: {response.status_code}")
    print(f"错误响应: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")

if __name__ == "__main__":
    try:
        print("=== 文件库API测试开始 ===")
        test_library_crud()
        test_library_list_with_filters()
        test_error_cases()
        print("\n=== 文件库API测试完成 ===")
    except Exception as e:
        print(f"测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc() 