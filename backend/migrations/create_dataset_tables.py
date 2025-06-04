#!/usr/bin/env python3
"""
创建数据集相关表的迁移脚本
"""
import sys
import os

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from app.db import db
from app.models.dataset import Dataset, DatasetVersion, DatasetTag, DatasetLike, DatasetDownload


def create_dataset_tables():
    """创建数据集相关表"""
    app = create_app()
    
    with app.app_context():
        try:
            # 创建所有数据集相关表
            db.create_all()
            print("✅ 数据集相关表创建成功")
            
            # 插入一些示例数据
            create_sample_data()
            
        except Exception as e:
            print(f"❌ 创建表失败: {e}")
            db.session.rollback()
        finally:
            db.session.close()


def create_sample_data():
    """创建示例数据"""
    try:
        # 检查是否已有数据
        if Dataset.query.first():
            print("📋 数据集表已有数据，跳过示例数据创建")
            return
        
        # 创建示例数据集
        datasets = [
            {
                'name': 'Mixture-of-Thoughts',
                'owner': 'open-r1',
                'description': 'A comprehensive dataset for training mixture of expert models with diverse reasoning capabilities.',
                'size': '699MB',
                'downloads': 11300,
                'likes': 140,
                'license': 'MIT',
                'task_type': 'Natural Language Processing',
                'language': 'English',
                'featured': True,
                'tags': ['reasoning', 'mixture-of-experts', 'llm']
            },
            {
                'name': 'SynLogic',
                'owner': 'MiniMaxAI',
                'description': 'Synthetic logical reasoning dataset generated using advanced language models.',
                'size': '49.3MB',
                'downloads': 211,
                'likes': 51,
                'license': 'Apache 2.0',
                'task_type': 'Question Answering',
                'language': 'English',
                'featured': False,
                'tags': ['logic', 'reasoning', 'synthetic']
            },
            {
                'name': 'china-refusals',
                'owner': 'cognitivecomputations',
                'description': 'Dataset focused on AI safety and alignment research with Chinese language examples.',
                'size': '10.1MB',
                'downloads': 302,
                'likes': 25,
                'license': 'CC BY 4.0',
                'task_type': 'Text Classification',
                'language': 'Chinese',
                'featured': False,
                'tags': ['safety', 'alignment', 'chinese']
            }
        ]
        
        for dataset_data in datasets:
            # 创建数据集
            tags = dataset_data.pop('tags')
            dataset = Dataset(**dataset_data)
            db.session.add(dataset)
            db.session.flush()  # 获取ID
            
            # 添加标签
            for tag_name in tags:
                tag = DatasetTag(dataset_id=dataset.id, name=tag_name)
                db.session.add(tag)
            
            # 创建初始版本
            version = DatasetVersion(
                dataset_id=dataset.id,
                version='v1.0',
                pipeline_config={},
                stats={}
            )
            db.session.add(version)
        
        db.session.commit()
        print("✅ 示例数据创建成功")
        
    except Exception as e:
        print(f"❌ 创建示例数据失败: {e}")
        db.session.rollback()


def drop_dataset_tables():
    """删除数据集相关表"""
    app = create_app()
    
    with app.app_context():
        try:
            # 删除表的顺序很重要（外键依赖）
            tables_to_drop = [
                'dataset_downloads',
                'dataset_likes', 
                'dataset_tags',
                'dataset_versions',
                'datasets'
            ]
            
            for table_name in tables_to_drop:
                db.session.execute(f"DROP TABLE IF EXISTS {table_name} CASCADE")
            
            db.session.commit()
            print("✅ 数据集相关表删除成功")
            
        except Exception as e:
            print(f"❌ 删除表失败: {e}")
            db.session.rollback()
        finally:
            db.session.close()


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='数据集表迁移脚本')
    parser.add_argument('--drop', action='store_true', help='删除现有表')
    parser.add_argument('--create', action='store_true', help='创建表')
    
    args = parser.parse_args()
    
    if args.drop:
        drop_dataset_tables()
    
    if args.create or not (args.drop):
        create_dataset_tables() 