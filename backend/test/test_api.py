"""API测试脚本"""
import requests
import json

BASE_URL = "http://localhost:5000/api/v1"

def test_health():
    """测试健康检查"""
    response = requests.get(f"{BASE_URL}/health")
    print("健康检查:", response.json())
    
def test_create_dataset():
    """测试创建数据集"""
    data = {
        "name": "测试数据集",
        "description": "这是一个测试数据集"
    }
    response = requests.post(f"{BASE_URL}/datasets", json=data)
    print("创建数据集:", response.json())
    return response.json()

def test_get_datasets():
    """测试获取数据集列表"""
    response = requests.get(f"{BASE_URL}/datasets")
    print("数据集列表:", response.json())

def test_get_stats():
    """测试获取统计信息"""
    response = requests.get(f"{BASE_URL}/overview/stats")
    print("统计信息:", response.json())

if __name__ == "__main__":
    print("开始测试API...")
    test_health()
    test_get_stats()
    test_create_dataset()
    test_get_datasets() 