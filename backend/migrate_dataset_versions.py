#!/usr/bin/env python3
"""
数据集版本迁移脚本
将普通的DatasetVersion转换为EnhancedDatasetVersion
"""

import sys
import uuid
from datetime import datetime

# 添加项目路径
sys.path.append('/Users/rqq/pindata')

from app import create_app
from app.db import db
from app.models.dataset import Dataset, DatasetVersion
from app.models.dataset_version import EnhancedDatasetVersion, EnhancedDatasetFile

def migrate_dataset_versions():
    """迁移数据集版本"""
    app = create_app()
    
    with app.app_context():
        print("开始迁移数据集版本...")
        
        # 获取所有普通版本
        old_versions = DatasetVersion.query.all()
        
        print(f"找到 {len(old_versions)} 个普通版本需要迁移")
        
        migrated_count = 0
        
        for old_version in old_versions:
            try:
                # 检查是否已经有增强版本
                existing_enhanced = EnhancedDatasetVersion.query.filter_by(
                    dataset_id=old_version.dataset_id
                ).first()
                
                if existing_enhanced:
                    print(f"数据集 {old_version.dataset_id} 已有增强版本，跳过")
                    continue
                
                # 获取数据集信息
                dataset = Dataset.query.get(old_version.dataset_id)
                if not dataset:
                    print(f"数据集 {old_version.dataset_id} 不存在，跳过")
                    continue
                
                # 创建增强版本
                version_id = str(uuid.uuid4())
                commit_hash = uuid.uuid4().hex[:8]
                
                enhanced_version = EnhancedDatasetVersion(
                    id=version_id,
                    dataset_id=old_version.dataset_id,
                    version=old_version.version or 'v1.0',
                    commit_hash=commit_hash,
                    commit_message=f'迁移自普通版本 - 数据集: {dataset.name}',
                    author=dataset.owner,
                    total_size=old_version.stats.get('total_size', 0) if old_version.stats else 0,
                    file_count=old_version.stats.get('file_count', 0) if old_version.stats else 0,
                    pipeline_config=old_version.pipeline_config or {},
                    stats=old_version.stats or {},
                    is_default=True
                )
                
                db.session.add(enhanced_version)
                
                # 如果有文件路径，创建文件记录
                if old_version.file_path:
                    # 从文件路径推断文件名
                    filename = old_version.file_path.split('/')[-1]
                    if not filename:
                        filename = f"{dataset.name}_dataset.zip"
                    
                    enhanced_file = EnhancedDatasetFile(
                        id=str(uuid.uuid4()),
                        version_id=version_id,
                        filename=filename,
                        file_path=old_version.file_path,
                        file_type='zip',
                        file_size=enhanced_version.total_size,
                        minio_bucket='datasets',
                        minio_object_name=old_version.file_path
                    )
                    
                    db.session.add(enhanced_file)
                
                # 删除旧版本
                db.session.delete(old_version)
                
                # 提交更改
                db.session.commit()
                
                migrated_count += 1
                print(f"✓ 成功迁移数据集 {dataset.name} (ID: {dataset.id})")
                
            except Exception as e:
                print(f"✗ 迁移数据集 {old_version.dataset_id} 失败: {str(e)}")
                db.session.rollback()
                continue
        
        print(f"\n迁移完成！成功迁移了 {migrated_count} 个数据集版本")

if __name__ == '__main__':
    migrate_dataset_versions() 