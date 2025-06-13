#!/usr/bin/env python3
"""
v1.0.4 为user_organizations表添加status列

这个迁移为user_organizations表添加status枚举列，
用于跟踪用户与组织关系的状态（活跃/非活跃）。
"""

from sqlalchemy import text
from datetime import datetime

MIGRATION_VERSION = "v1.0.4"
MIGRATION_DESCRIPTION = "为user_organizations表添加status列"
MIGRATION_AUTHOR = "系统"
MIGRATION_DATE = datetime.now().isoformat()

def up(conn):
    """添加user_organizations.status列"""
    print(f"执行迁移: {MIGRATION_DESCRIPTION}")
    
    # 1. 创建UserOrgStatus枚举类型
    print("创建UserOrgStatus枚举类型...")
    conn.execute(text("""
        DO $$ BEGIN
            CREATE TYPE userorgstatus AS ENUM ('active', 'inactive');
        EXCEPTION
            WHEN duplicate_object THEN 
                RAISE NOTICE 'UserOrgStatus枚举类型已存在，跳过创建';
        END $$;
    """))
    
    # 2. 检查status列是否已存在
    result = conn.execute(text("""
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name = 'user_organizations' 
        AND column_name = 'status'
    """))
    
    column_exists = result.fetchone()[0] > 0
    
    if not column_exists:
        # 3. 添加status列
        print("为user_organizations表添加status列...")
        conn.execute(text("""
            ALTER TABLE user_organizations 
            ADD COLUMN status userorgstatus DEFAULT 'active'
        """))
        
        # 4. 更新现有记录的status值
        print("更新现有记录的status值为'active'...")
        conn.execute(text("""
            UPDATE user_organizations 
            SET status = 'active' 
            WHERE status IS NULL
        """))
        
        # 5. 添加索引以提高查询性能
        print("为status列添加索引...")
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_user_organizations_status 
            ON user_organizations(status)
        """))
        
        print("✅ status列添加成功")
    else:
        print("ℹ️  status列已存在，跳过添加")
    
    # 6. 验证列的添加结果
    print("验证status列配置...")
    result = conn.execute(text("""
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'user_organizations' 
        AND column_name = 'status'
    """))
    
    column_info = result.fetchone()
    if column_info:
        col_name, data_type, default_val, nullable = column_info
        print(f"✅ status列验证成功:")
        print(f"   - 列名: {col_name}")
        print(f"   - 数据类型: {data_type}")
        print(f"   - 默认值: {default_val}")
        print(f"   - 可为空: {nullable}")
    else:
        raise Exception("status列验证失败：未找到列信息")
    
    # 7. 验证枚举值
    print("验证UserOrgStatus枚举值...")
    result = conn.execute(text("""
        SELECT enumlabel 
        FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'userorgstatus'
        ORDER BY enumsortorder
    """))
    
    enum_values = [row[0] for row in result.fetchall()]
    expected_values = ['active', 'inactive']
    
    if enum_values == expected_values:
        print(f"✅ 枚举值验证成功: {enum_values}")
    else:
        raise Exception(f"枚举值验证失败: 期望 {expected_values}, 实际 {enum_values}")
    
    # 8. 统计当前user_organizations表的记录
    result = conn.execute(text("""
        SELECT 
            COUNT(*) as total_records,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_records,
            COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_records
        FROM user_organizations
    """))
    
    stats = result.fetchone()
    if stats:
        total, active, inactive = stats
        print(f"📊 用户组织关系统计:")
        print(f"   - 总记录数: {total}")
        print(f"   - 活跃记录: {active}")
        print(f"   - 非活跃记录: {inactive}")
    
    print("✅ v1.0.4迁移执行完成")

def down(conn):
    """回滚user_organizations.status列添加"""
    print(f"回滚迁移: {MIGRATION_DESCRIPTION}")
    
    # 1. 删除status列的索引
    print("删除status列索引...")
    conn.execute(text("""
        DROP INDEX IF EXISTS idx_user_organizations_status
    """))
    
    # 2. 删除status列
    print("删除user_organizations表的status列...")
    conn.execute(text("""
        ALTER TABLE user_organizations 
        DROP COLUMN IF EXISTS status
    """))
    
    # 3. 删除UserOrgStatus枚举类型
    print("删除UserOrgStatus枚举类型...")
    conn.execute(text("""
        DROP TYPE IF EXISTS userorgstatus
    """))
    
    print("✅ v1.0.4迁移回滚完成")

def get_migration_info():
    """获取迁移信息"""
    return {
        'version': MIGRATION_VERSION,
        'description': MIGRATION_DESCRIPTION,
        'author': MIGRATION_AUTHOR,
        'date': MIGRATION_DATE
    }