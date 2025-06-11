"""
应用启动时的数据库迁移检查和自动迁移

集成到Flask应用中，在启动时自动检查和执行必要的迁移
"""

import os
import sys
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def check_and_migrate(database_url: str, auto_migrate: bool = True) -> bool:
    """
    检查数据库迁移状态并根据配置自动执行
    
    Args:
        database_url: 数据库连接URL
        auto_migrate: 是否自动执行迁移
    
    Returns:
        bool: 迁移是否成功
    """
    try:
        # 动态导入迁移管理器
        migrations_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'migrations')
        sys.path.append(migrations_dir)
        
        from migration_manager import MigrationManager
        
        manager = MigrationManager(database_url, migrations_dir)
        
        # 检查迁移状态
        current_version = manager.get_current_schema_version()
        pending_migrations = manager.get_pending_migrations()
        
        logger.info(f"当前数据库版本: {current_version or '未知'}")
        logger.info(f"待执行迁移数量: {len(pending_migrations)}")
        
        if not pending_migrations:
            logger.info("✅ 数据库已是最新版本")
            return True
        
        if not auto_migrate:
            logger.warning(f"⚠️  发现 {len(pending_migrations)} 个待执行的迁移，但自动迁移已禁用")
            logger.warning("请手动运行: ./migrate migrate")
            return False
        
        # 自动执行迁移
        logger.info(f"🔄 开始执行 {len(pending_migrations)} 个迁移...")
        
        for migration in pending_migrations:
            logger.info(f"执行迁移: {migration['version']} - {migration['filename']}")
        
        success = manager.migrate()
        
        if success:
            logger.info("✅ 数据库迁移执行成功")
        else:
            logger.error("❌ 数据库迁移执行失败")
            
        return success
        
    except ImportError as e:
        logger.error(f"无法导入迁移管理器: {e}")
        return False
    except Exception as e:
        logger.error(f"迁移检查失败: {e}")
        return False

def get_migration_status(database_url: str) -> Optional[dict]:
    """
    获取数据库迁移状态信息
    
    Returns:
        dict: 包含版本信息和迁移状态的字典
    """
    try:
        migrations_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'migrations')
        sys.path.append(migrations_dir)
        
        from migration_manager import MigrationManager
        
        manager = MigrationManager(database_url, migrations_dir)
        
        current_version = manager.get_current_schema_version()
        pending_migrations = manager.get_pending_migrations()
        schema_info = manager.detect_current_schema()
        
        return {
            'current_version': current_version,
            'pending_migrations_count': len(pending_migrations),
            'pending_migrations': [m['version'] for m in pending_migrations],
            'has_auth_system': schema_info.get('has_auth_system', False),
            'has_migration_table': schema_info.get('has_migration_table', False),
            'tables_count': len(schema_info.get('tables', []))
        }
        
    except Exception as e:
        logger.error(f"获取迁移状态失败: {e}")
        return None