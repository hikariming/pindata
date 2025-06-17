#!/usr/bin/env python3
"""
修复版本显示问题的脚本

确保应用显示真正的最新版本而不是最后执行的版本
"""

import os
import sys
from sqlalchemy import create_engine, text

def get_database_url():
    """获取数据库连接URL"""
    # 从环境变量获取
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        return db_url
    
    # 从.env文件读取
    env_file = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            for line in f:
                if line.startswith('DATABASE_URL='):
                    return line.split('=', 1)[1].strip()
    
    # 默认值
    return 'postgresql://postgres:password@localhost:5432/pindata_dataset'

def parse_version(version: str) -> tuple:
    """解析版本号为可比较的元组"""
    try:
        # 移除'v'前缀并拆分为数字
        version_parts = version.lstrip('v').split('.')
        return tuple(int(part) for part in version_parts)
    except:
        # 如果解析失败，返回0
        return (0, 0, 0)

def main():
    print("🔧 修复版本显示问题...")
    
    try:
        # 获取数据库连接
        db_url = get_database_url()
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            # 获取所有成功的迁移
            result = conn.execute(text("""
                SELECT version, executed_at FROM schema_migrations 
                WHERE status = 'SUCCESS' 
                ORDER BY executed_at
            """))
            
            migrations = result.fetchall()
            print(f"📋 发现 {len(migrations)} 个成功的迁移:")
            
            for version, executed_at in migrations:
                print(f"  - {version} (执行于: {executed_at})")
            
            if migrations:
                # 按版本号排序获取最新版本
                versions = [m[0] for m in migrations]
                latest_version = sorted(versions, key=parse_version, reverse=True)[0]
                
                # 按执行时间获取最后执行的版本
                last_executed = migrations[-1][0]
                
                print(f"\n📊 版本分析:")
                print(f"  - 按版本号排序的最新版本: {latest_version}")
                print(f"  - 按执行时间的最后版本: {last_executed}")
                
                if latest_version != last_executed:
                    print(f"\n⚠️  检测到版本显示不一致!")
                    print(f"   建议应用显示版本: {latest_version}")
                    print(f"   当前应用显示版本: {last_executed}")
                    print(f"\n✅ 优化后的版本检测已生效，重启应用即可看到正确版本")
                else:
                    print(f"\n✅ 版本显示正常，最新版本: {latest_version}")
            
            return True
            
    except Exception as e:
        print(f"❌ 检查版本时出错: {e}")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1) 