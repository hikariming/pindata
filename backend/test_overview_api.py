#!/usr/bin/env python3

import requests
import json
import sys
import os

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

API_BASE_URL = "http://localhost:8897/api/v1"

def test_api_endpoint(endpoint, description):
    """测试API端点"""
    url = f"{API_BASE_URL}{endpoint}"
    print(f"\n测试 {description}")
    print(f"URL: {url}")
    print("-" * 50)
    
    try:
        response = requests.get(url, timeout=10)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("响应数据:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            return True
        else:
            print(f"错误: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("错误: 无法连接到服务器。请确保后端服务正在运行。")
        return False
    except requests.exceptions.Timeout:
        print("错误: 请求超时")
        return False
    except Exception as e:
        print(f"错误: {str(e)}")
        return False

def main():
    print("=== pindata Overview API 测试 ===")
    
    # 测试各个API端点
    endpoints = [
        ("/overview/stats", "系统统计信息"),
        ("/overview/recent-activities", "最近活动"),
        ("/overview/notifications", "系统通知"),
        ("/health", "健康检查")
    ]
    
    success_count = 0
    total_count = len(endpoints)
    
    for endpoint, description in endpoints:
        if test_api_endpoint(endpoint, description):
            success_count += 1
    
    print(f"\n=== 测试总结 ===")
    print(f"成功: {success_count}/{total_count}")
    
    if success_count == total_count:
        print("✅ 所有API端点都正常工作!")
        return 0
    else:
        print("❌ 部分API端点存在问题")
        return 1

if __name__ == "__main__":
    exit(main()) 