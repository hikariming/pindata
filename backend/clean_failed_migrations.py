#!/usr/bin/env python3
"""
清理失败的迁移记录

移除所有失败的迁移记录，确保版本显示正确
"""

import os
from sqlalchemy import create_engine, text

def main():
    print("🧹 清理失败的迁移记录...")
    
    # 获取数据库连接
    db_url = 'postgresql://postgres:password@localhost:5432/pindata_dataset'
    engine = create_engine(db_url)
    
    with engine.connect() as conn:
        # 首先查看现有的迁移记录
        result = conn.execute(text("""
            SELECT version, status, executed_at 
            FROM schema_migrations 
            ORDER BY executed_at
        """))
        migrations = result.fetchall()
        
        print(f"📋 当前迁移记录总数: {len(migrations)}")
        
        failed_migrations = [m for m in migrations if m[1] == 'FAILED']
        success_migrations = [m for m in migrations if m[1] == 'SUCCESS']
        
        print(f"✅ 成功的迁移: {len(success_migrations)}")
        print(f"❌ 失败的迁移: {len(failed_migrations)}")
        
        if failed_migrations:
            print(f"\n🗑️  将要删除的失败迁移:")
            for version, status, executed_at in failed_migrations:
                print(f"  - {version} ({status}) - {executed_at}")
            
            # 删除失败的迁移记录
            result = conn.execute(text("""
                DELETE FROM schema_migrations 
                WHERE status = 'FAILED'
            """))
            deleted_count = result.rowcount
            conn.commit()
            
            print(f"\n✅ 已删除 {deleted_count} 个失败的迁移记录")
        else:
            print("\n✅ 没有失败的迁移记录需要清理")
        
        # 显示清理后的状态
        print(f"\n📊 清理后的迁移状态:")
        result = conn.execute(text("""
            SELECT version, status, executed_at 
            FROM schema_migrations 
            ORDER BY executed_at
        """))
        remaining_migrations = result.fetchall()
        
        for version, status, executed_at in remaining_migrations:
            print(f"  ✅ {version} ({status}) - {executed_at}")
        
        # 计算真正的最新版本
        success_versions = [m[0] for m in remaining_migrations if m[1] == 'SUCCESS']
        
        def parse_version(v):
            try:
                return tuple(int(x) for x in v.lstrip('v').split('.'))
            except:
                return (0, 0, 0)
        
        if success_versions:
            latest_version = sorted(success_versions, key=parse_version, reverse=True)[0]
            print(f"\n🎯 当前最新版本: {latest_version}")
            print(f"✅ 重启应用后将正确显示版本: {latest_version}")
        
        return True

if __name__ == '__main__':
    main() 