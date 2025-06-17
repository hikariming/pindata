#!/usr/bin/env python3
"""
快速修复脚本

专门解决大版本更新后的数据库问题。
这个脚本会:
1. 修复 user_organizations 表的 status 字段问题
2. 处理事务错误
3. 确保应用能正常启动
"""

import os
import sys
from sqlalchemy import create_engine, text
from datetime import datetime

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

def fix_enum_types(engine):
    """修复枚举类型"""
    print("🔧 修复枚举类型...")
    
    with engine.connect() as conn:
        try:
            conn.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE userorgstatus AS ENUM ('active', 'inactive');
                    RAISE NOTICE '✅ userorgstatus 枚举类型创建成功';
                EXCEPTION
                    WHEN duplicate_object THEN 
                        RAISE NOTICE 'ℹ️  userorgstatus 枚举类型已存在';
                END $$;
            """))
            conn.commit()
            print("✅ userorgstatus 枚举类型处理完成")
        except Exception as e:
            print(f"⚠️ userorgstatus 处理失败: {e}")
        
        try:
            conn.execute(text("""
                DO $$ BEGIN
                    CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
                    RAISE NOTICE '✅ user_status 枚举类型创建成功';
                EXCEPTION
                    WHEN duplicate_object THEN 
                        RAISE NOTICE 'ℹ️  user_status 枚举类型已存在';
                END $$;
            """))
            conn.commit()
            print("✅ user_status 枚举类型处理完成")
        except Exception as e:
            print(f"⚠️ user_status 处理失败: {e}")

def fix_user_organizations_table(engine):
    """修复 user_organizations 表"""
    print("🔧 修复 user_organizations 表...")
    
    with engine.connect() as conn:
        # 检查表是否存在
        result = conn.execute(text("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name = 'user_organizations'
        """))
        
        if result.fetchone()[0] == 0:
            print("⚠️ user_organizations 表不存在，跳过修复")
            return
        
        # 检查并添加 status 字段
        result = conn.execute(text("""
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'user_organizations' AND column_name = 'status'
        """))
        
        if result.fetchone()[0] == 0:
            try:
                conn.execute(text("""
                    ALTER TABLE user_organizations 
                    ADD COLUMN status userorgstatus DEFAULT 'active'
                """))
                conn.commit()
                print("✅ 添加 status 字段成功")
            except Exception as e:
                print(f"⚠️ 添加 status 字段失败: {e}")
        else:
            print("ℹ️  status 字段已存在")
        
        # 检查并添加 created_at 字段
        result = conn.execute(text("""
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'user_organizations' AND column_name = 'created_at'
        """))
        
        if result.fetchone()[0] == 0:
            try:
                conn.execute(text("""
                    ALTER TABLE user_organizations 
                    ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                """))
                conn.commit()
                print("✅ 添加 created_at 字段成功")
            except Exception as e:
                print(f"⚠️ 添加 created_at 字段失败: {e}")
        else:
            print("ℹ️  created_at 字段已存在")
        
        # 检查并添加 updated_at 字段
        result = conn.execute(text("""
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'user_organizations' AND column_name = 'updated_at'
        """))
        
        if result.fetchone()[0] == 0:
            try:
                conn.execute(text("""
                    ALTER TABLE user_organizations 
                    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                """))
                conn.commit()
                print("✅ 添加 updated_at 字段成功")
            except Exception as e:
                print(f"⚠️ 添加 updated_at 字段失败: {e}")
        else:
            print("ℹ️  updated_at 字段已存在")
        
        # 更新现有记录的状态
        try:
            conn.execute(text("""
                UPDATE user_organizations 
                SET status = 'active' 
                WHERE status IS NULL
            """))
            conn.commit()
            print("✅ 更新现有记录状态完成")
        except Exception as e:
            print(f"⚠️ 更新记录状态失败: {e}")

def create_indexes(engine):
    """创建必需的索引"""
    print("🔧 创建索引...")
    
    with engine.connect() as conn:
        try:
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_user_organizations_status 
                ON user_organizations (status)
            """))
            conn.commit()
            print("✅ user_organizations.status 索引创建成功")
        except Exception as e:
            print(f"⚠️ 创建索引失败: {e}")

def verify_fix(engine):
    """验证修复结果"""
    print("🔍 验证修复结果...")
    
    with engine.connect() as conn:
        try:
            # 测试查询 user_organizations 表
            result = conn.execute(text("""
                SELECT COUNT(*) FROM user_organizations 
                WHERE status = 'active'
            """))
            count = result.fetchone()[0]
            print(f"✅ user_organizations 表查询成功，活跃记录数: {count}")
            return True
        except Exception as e:
            print(f"❌ 验证失败: {e}")
            return False

def main():
    print("🚀 开始快速修复数据库问题...")
    print("=" * 50)
    
    try:
        # 获取数据库连接
        db_url = get_database_url()
        print(f"📡 连接数据库: {db_url.split('@')[1] if '@' in db_url else db_url}")
        
        engine = create_engine(db_url)
        
        # 测试连接
        with engine.connect():
            print("✅ 数据库连接成功")
        
        # 执行修复步骤
        fix_enum_types(engine)
        fix_user_organizations_table(engine)
        create_indexes(engine)
        
        # 验证修复结果
        if verify_fix(engine):
            print("\n" + "=" * 50)
            print("🎉 快速修复完成！")
            print("现在可以重新启动应用:")
            print("  python run.py")
            print("=" * 50)
            return True
        else:
            print("\n" + "=" * 50)
            print("❌ 修复验证失败，请查看错误信息")
            print("=" * 50)
            return False
        
    except Exception as e:
        print(f"\n❌ 修复过程出错: {e}")
        print("\n🔧 手动修复建议:")
        print("1. 检查数据库连接")
        print("2. 确认数据库权限")
        print("3. 运行: python sync_database.py --sync --force")
        print("=" * 50)
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1) 