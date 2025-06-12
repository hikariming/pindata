#!/usr/bin/env python3
"""
v1.0.3 确保数据治理权限正确设置

这个迁移专门用于确保数据治理相关权限在全新系统中正确设置，
特别针对新Docker环境启动时的权限初始化。
"""

from sqlalchemy import text
from datetime import datetime

MIGRATION_VERSION = "v1.0.3"
MIGRATION_DESCRIPTION = "确保数据治理权限正确设置"
MIGRATION_AUTHOR = "系统"
MIGRATION_DATE = datetime.now().isoformat()

def up(conn):
    """确保数据治理权限正确设置"""
    print(f"执行迁移: {MIGRATION_DESCRIPTION}")
    
    # 1. 确保数据治理权限存在
    print("检查并创建数据治理权限...")
    governance_permissions = [
        ('创建数据治理工程', 'governance.create', '创建新数据治理工程的权限', 'governance'),
        ('查看数据治理工程', 'governance.read', '查看数据治理工程的权限', 'governance'),
        ('编辑数据治理工程', 'governance.update', '编辑数据治理工程的权限', 'governance'),
        ('删除数据治理工程', 'governance.delete', '删除数据治理工程的权限', 'governance'),
        ('管理数据治理工程', 'governance.manage', '数据治理工程管理权限（包含所有操作）', 'governance'),
    ]
    
    for name, code, desc, category in governance_permissions:
        conn.execute(text("""
            INSERT INTO permissions (name, code, description, category, is_system_permission)
            SELECT :name, :code, :desc, :category, true
            WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = :code)
        """), {'name': name, 'code': code, 'desc': desc, 'category': category})
    
    # 2. 确保超级管理员拥有所有数据治理权限
    print("为超级管理员分配数据治理权限...")
    conn.execute(text("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id 
        FROM roles r, permissions p 
        WHERE r.code = 'super_admin' 
        AND p.category = 'governance'
        AND NOT EXISTS (
            SELECT 1 FROM role_permissions rp 
            WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    """))
    
    # 3. 确保系统管理员有数据治理管理权限
    print("为系统管理员分配数据治理权限...")
    conn.execute(text("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id 
        FROM roles r, permissions p 
        WHERE r.code = 'admin' 
        AND p.code = 'governance.manage'
        AND NOT EXISTS (
            SELECT 1 FROM role_permissions rp 
            WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    """))
    
    # 4. 确保数据管理员有数据治理管理权限
    print("为数据管理员分配数据治理权限...")
    conn.execute(text("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id 
        FROM roles r, permissions p 
        WHERE r.code = 'data_admin' 
        AND p.code = 'governance.manage'
        AND NOT EXISTS (
            SELECT 1 FROM role_permissions rp 
            WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    """))
    
    # 5. 确保普通用户有基础数据治理权限（创建、查看、编辑）
    print("为普通用户分配数据治理权限...")
    user_governance_permissions = ['governance.create', 'governance.read', 'governance.update']
    
    for perm_code in user_governance_permissions:
        conn.execute(text("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id 
            FROM roles r, permissions p 
            WHERE r.code = 'user' 
            AND p.code = :perm_code
            AND NOT EXISTS (
                SELECT 1 FROM role_permissions rp 
                WHERE rp.role_id = r.id AND rp.permission_id = p.id
            )
        """), {'perm_code': perm_code})
    
    # 6. 确保访客有数据治理查看权限
    print("为访客分配数据治理查看权限...")
    conn.execute(text("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id 
        FROM roles r, permissions p 
        WHERE r.code = 'viewer' 
        AND p.code = 'governance.read'
        AND NOT EXISTS (
            SELECT 1 FROM role_permissions rp 
            WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    """))
    
    # 7. 验证权限分配结果
    print("验证数据治理权限分配结果...")
    result = conn.execute(text("""
        SELECT r.name, r.code, COUNT(p.id) as permission_count
        FROM roles r
        LEFT JOIN role_permissions rp ON r.id = rp.role_id
        LEFT JOIN permissions p ON rp.permission_id = p.id AND p.category = 'governance'
        WHERE r.type = 'SYSTEM'
        GROUP BY r.id, r.name, r.code
        ORDER BY r.code
    """))
    
    print("数据治理权限分配统计:")
    for row in result.fetchall():
        role_name, role_code, perm_count = row
        print(f"  - {role_name} ({role_code}): {perm_count} 个数据治理权限")
    
    # 8. 检查是否有用户需要默认分配角色
    print("检查用户角色分配...")
    result = conn.execute(text("""
        SELECT COUNT(*) FROM users u
        WHERE NOT EXISTS (
            SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
        )
    """))
    
    users_without_roles = result.fetchone()[0]
    if users_without_roles > 0:
        print(f"发现 {users_without_roles} 个用户没有分配角色，为其分配默认用户角色...")
        
        # 为没有角色的用户分配默认用户角色
        conn.execute(text("""
            INSERT INTO user_roles (user_id, role_id, status)
            SELECT u.id, r.id, 'ACTIVE'
            FROM users u, roles r
            WHERE r.code = 'user' AND r.type = 'SYSTEM'
            AND NOT EXISTS (
                SELECT 1 FROM user_roles ur 
                WHERE ur.user_id = u.id
            )
        """))
    
    print("✅ 数据治理权限确保完成")
    print("📋 权限分配摘要:")
    print("  - 超级管理员: 全部数据治理权限")
    print("  - 系统管理员: 管理权限")
    print("  - 数据管理员: 管理权限")
    print("  - 普通用户: 创建、查看、编辑权限")
    print("  - 访客: 查看权限")

def down(conn):
    """回滚数据治理权限设置"""
    print(f"回滚迁移: {MIGRATION_DESCRIPTION}")
    
    # 删除数据治理相关的角色权限
    conn.execute(text("""
        DELETE FROM role_permissions 
        WHERE permission_id IN (
            SELECT id FROM permissions WHERE category = 'governance'
        )
    """))
    
    # 删除数据治理权限
    conn.execute(text("""
        DELETE FROM permissions WHERE category = 'governance'
    """))
    
    print("✅ 数据治理权限回滚完成")

def get_migration_info():
    """获取迁移信息"""
    return {
        'version': MIGRATION_VERSION,
        'description': MIGRATION_DESCRIPTION,
        'author': MIGRATION_AUTHOR,
        'date': MIGRATION_DATE
    } 