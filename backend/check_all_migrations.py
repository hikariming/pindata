#!/usr/bin/env python3
"""
检查所有迁移记录的完整状态
"""

import os
from sqlalchemy import create_engine, text

def main():
    print("🔍 检查数据库中所有迁移记录...")
    
    # 获取数据库连接
    db_url = 'postgresql://postgres:password@localhost:5432/pindata_dataset'
    engine = create_engine(db_url)
    
    with engine.connect() as conn:
        # 获取所有迁移记录
        result = conn.execute(text("""
            SELECT version, status, executed_at, filename 
            FROM schema_migrations 
            ORDER BY executed_at
        """))
        migrations = result.fetchall()
        
        print(f"📋 总共发现 {len(migrations)} 个迁移记录:")
        for version, status, executed_at, filename in migrations:
            status_icon = "✅" if status == 'SUCCESS' else "❌"
            print(f"  {status_icon} {version} ({status}) - {executed_at}")
            if filename:
                print(f"     文件: {filename}")
        
        print("\n📊 按版本号排序:")
        success_versions = [m[0] for m in migrations if m[1] == 'SUCCESS']
        
        def parse_version(v):
            try:
                return tuple(int(x) for x in v.lstrip('v').split('.'))
            except:
                return (0, 0, 0)
        
        sorted_versions = sorted(success_versions, key=parse_version)
        for v in sorted_versions:
            print(f"  ✅ {v}")
        
        if sorted_versions:
            latest = sorted(success_versions, key=parse_version, reverse=True)[0]
            print(f"\n🎯 真正的最新版本: {latest}")
            
            # 检查为什么应用显示的版本不同
            last_executed = migrations[-1][0] if migrations else None
            if last_executed and last_executed != latest:
                print(f"⚠️  应用显示版本 ({last_executed}) 与最新版本 ({latest}) 不同")
                print("这可能是因为版本检测逻辑使用了执行时间而不是版本号排序")
            else:
                print("✅ 版本显示一致")

if __name__ == '__main__':
    main() 