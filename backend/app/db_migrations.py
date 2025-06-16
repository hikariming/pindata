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


def force_migrate_to_latest():
    """
    强制迁移到最新版本 - 可以作为独立脚本运行
    """
    import os
    from dotenv import load_dotenv
    
    # 加载环境变量
    load_dotenv()
    
    # 构建数据库URL
    DATABASE_HOST = os.getenv('DATABASE_HOST', 'localhost')
    DATABASE_PORT = os.getenv('DATABASE_PORT', '5432')
    DATABASE_USER = os.getenv('DATABASE_USER', 'postgres')
    DATABASE_PASSWORD = os.getenv('DATABASE_PASSWORD', '')
    DATABASE_NAME = os.getenv('DATABASE_NAME', 'pindata_dataset')
    
    database_url = f"postgresql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"
    
    print(f"🔗 数据库连接: {DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}")
    print("=" * 50)
    
    try:
        # 动态导入迁移管理器
        migrations_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'migrations')
        sys.path.append(migrations_dir)
        
        from migration_manager import MigrationManager
        
        manager = MigrationManager(database_url, migrations_dir)
        
        # 初始化迁移表
        print("🔧 初始化迁移记录表...")
        manager.init_migrations_table()
        
        # 检查当前状态
        current_version = manager.get_current_schema_version()
        pending_migrations = manager.get_pending_migrations()
        
        print(f"📊 当前数据库版本: {current_version or '未知'}")
        print(f"📊 待执行迁移数量: {len(pending_migrations)}")
        
        if pending_migrations:
            print("\n📋 待执行的迁移:")
            for migration in pending_migrations:
                print(f"  - {migration['version']}: {migration['filename']}")
        
        if not pending_migrations:
            print("✅ 数据库已是最新版本！")
            return True
        
        # 执行迁移
        print(f"\n🚀 开始执行 {len(pending_migrations)} 个迁移...")
        success = manager.migrate()
        
        if success:
            new_version = manager.get_current_schema_version()
            print(f"✅ 迁移执行成功！新版本: {new_version}")
        else:
            print("❌ 迁移执行失败！")
            
        return success
        
    except Exception as e:
        print(f"❌ 迁移过程中出现错误: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    """当作为独立脚本运行时，执行强制迁移"""
    success = force_migrate_to_latest()
    sys.exit(0 if success else 1)