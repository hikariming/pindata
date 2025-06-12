#!/usr/bin/env python3
"""
数据库迁移脚本 - 创建用户管理相关表
执行命令: python migrations/create_user_management_tables.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import db
from app.models import (
    User, Organization, Role, Permission,
    UserOrganization, UserRole, RolePermission,
    ResourcePermission, UserSession, AuditLog
)
from config.config import get_config

def create_tables():
    """创建用户管理相关表"""
    config = get_config()
    
    try:
        print("开始创建用户管理相关表...")
        
        # 创建所有表
        db.create_all()
        
        print("✓ 用户管理表创建成功")
        
        # 初始化基础数据
        init_basic_data()
        
        print("✓ 基础数据初始化完成")
        print("用户管理系统数据库迁移完成！")
        
    except Exception as e:
        print(f"✗ 创建表时出错: {e}")
        db.session.rollback()
        raise


def init_basic_data():
    """初始化基础数据"""
    try:
        # 创建系统内置权限
        create_system_permissions()
        
        # 创建系统内置角色
        create_system_roles()
        
        # 创建默认组织
        create_default_organization()
        
        # 创建系统管理员用户
        create_admin_user()
        
        db.session.commit()
        
    except Exception as e:
        db.session.rollback()
        raise e


def create_system_permissions():
    """创建系统内置权限"""
    from app.models import Permission, PermissionType
    
    permissions = [
        # 系统管理权限
        {"name": "系统管理", "code": "system.manage", "resource": "system", "action": "manage", "category": "system"},
        {"name": "用户管理", "code": "user.manage", "resource": "user", "action": "manage", "category": "user"},
        {"name": "组织管理", "code": "organization.manage", "resource": "organization", "action": "manage", "category": "organization"},
        {"name": "角色管理", "code": "role.manage", "resource": "role", "action": "manage", "category": "role"},
        
        # 数据集权限
        {"name": "创建数据集", "code": "dataset.create", "resource": "dataset", "action": "create", "category": "dataset"},
        {"name": "查看数据集", "code": "dataset.read", "resource": "dataset", "action": "read", "category": "dataset"},
        {"name": "编辑数据集", "code": "dataset.update", "resource": "dataset", "action": "update", "category": "dataset"},
        {"name": "删除数据集", "code": "dataset.delete", "resource": "dataset", "action": "delete", "category": "dataset"},
        {"name": "管理数据集", "code": "dataset.manage", "resource": "dataset", "action": "manage", "category": "dataset"},
        
        # 文件库权限
        {"name": "创建文件库", "code": "library.create", "resource": "library", "action": "create", "category": "library"},
        {"name": "查看文件库", "code": "library.read", "resource": "library", "action": "read", "category": "library"},
        {"name": "编辑文件库", "code": "library.update", "resource": "library", "action": "update", "category": "library"},
        {"name": "删除文件库", "code": "library.delete", "resource": "library", "action": "delete", "category": "library"},
        {"name": "管理文件库", "code": "library.manage", "resource": "library", "action": "manage", "category": "library"},
        
        # 任务权限
        {"name": "创建任务", "code": "task.create", "resource": "task", "action": "create", "category": "task"},
        {"name": "查看任务", "code": "task.read", "resource": "task", "action": "read", "category": "task"},
        {"name": "管理任务", "code": "task.manage", "resource": "task", "action": "manage", "category": "task"},
        
        # LLM配置权限
        {"name": "LLM配置管理", "code": "llm_config.manage", "resource": "llm_config", "action": "manage", "category": "llm"},
        
        # 系统日志权限
        {"name": "查看系统日志", "code": "system_log.read", "resource": "system_log", "action": "read", "category": "system"},
    ]
    
    for perm_data in permissions:
        existing = Permission.query.filter_by(code=perm_data["code"]).first()
        if not existing:
            permission = Permission(**perm_data, type=PermissionType.SYSTEM)
            db.session.add(permission)
    
    print("✓ 系统权限创建完成")


def create_system_roles():
    """创建系统内置角色"""
    from app.models import Role, RoleType, Permission, RolePermission
    
    roles_data = [
        {
            "name": "超级管理员", 
            "code": "super_admin", 
            "description": "系统超级管理员，拥有所有权限",
            "permissions": ["system.manage", "user.manage", "organization.manage", "role.manage"]
        },
        {
            "name": "系统管理员", 
            "code": "admin", 
            "description": "系统管理员，拥有大部分管理权限",
            "permissions": ["user.manage", "organization.manage", "dataset.manage", "library.manage", "task.manage"]
        },
        {
            "name": "数据管理员", 
            "code": "data_admin", 
            "description": "数据管理员，可以管理数据集和文件库",
            "permissions": ["dataset.manage", "library.manage", "task.manage", "llm_config.manage"]
        },
        {
            "name": "普通用户", 
            "code": "user", 
            "description": "普通用户，可以创建和管理自己的数据",
            "permissions": ["dataset.create", "dataset.read", "dataset.update", "library.create", "library.read", "library.update", "task.create", "task.read"]
        },
        {
            "name": "访客", 
            "code": "viewer", 
            "description": "只读访客，只能查看公开数据",
            "permissions": ["dataset.read", "library.read", "task.read"]
        },
    ]
    
    for role_data in roles_data:
        existing = Role.query.filter_by(code=role_data["code"]).first()
        if not existing:
            role = Role(
                name=role_data["name"],
                code=role_data["code"], 
                description=role_data["description"],
                type=RoleType.SYSTEM
            )
            db.session.add(role)
            db.session.flush()  # 获取role.id
            
            # 分配权限
            for perm_code in role_data["permissions"]:
                permission = Permission.query.filter_by(code=perm_code).first()
                if permission:
                    role_perm = RolePermission(role_id=role.id, permission_id=permission.id)
                    db.session.add(role_perm)
    
    print("✓ 系统角色创建完成")


def create_default_organization():
    """创建默认组织"""
    from app.models import Organization
    
    existing = Organization.query.filter_by(code="root").first()
    if not existing:
        org = Organization(
            name="系统默认组织",
            code="root",
            description="系统默认根组织",
            path="/root",
            level=1
        )
        db.session.add(org)
    
    print("✓ 默认组织创建完成")


def create_admin_user():
    """创建系统管理员用户"""
    from app.models import User, Role, UserRole, Organization, UserOrganization
    from werkzeug.security import generate_password_hash
    
    # 检查是否已存在管理员用户
    existing = User.query.filter_by(username="admin").first()
    if not existing:
        # 创建管理员用户
        admin_user = User(
            username="admin",
            email="admin@pindata.com",
            password_hash=generate_password_hash("admin123"),
            full_name="系统管理员"
        )
        db.session.add(admin_user)
        db.session.flush()
        
        # 分配超级管理员角色
        super_admin_role = Role.query.filter_by(code="super_admin").first()
        if super_admin_role:
            user_role = UserRole(user_id=admin_user.id, role_id=super_admin_role.id)
            db.session.add(user_role)
        
        # 加入默认组织
        root_org = Organization.query.filter_by(code="root").first()
        if root_org:
            user_org = UserOrganization(
                user_id=admin_user.id, 
                organization_id=root_org.id,
                is_primary=True,
                position="系统管理员"
            )
            db.session.add(user_org)
        
        print("✓ 系统管理员用户创建完成")
        print("  用户名: admin")
        print("  密码: admin123")
        print("  邮箱: admin@pindata.com")
    else:
        print("✓ 管理员用户已存在，跳过创建")


def drop_tables():
    """删除用户管理相关表（谨慎使用）"""
    if input("确定要删除所有用户管理表吗？这将清除所有用户数据！(输入 'YES' 确认): ") == "YES":
        try:
            # 按依赖关系顺序删除表
            tables_to_drop = [
                'audit_logs', 'user_sessions', 'resource_permissions',
                'role_permissions', 'user_roles', 'user_organizations',
                'permissions', 'roles', 'organizations', 'users'
            ]
            
            for table_name in tables_to_drop:
                db.engine.execute(f"DROP TABLE IF EXISTS {table_name} CASCADE")
            
            print("✓ 用户管理表删除完成")
        except Exception as e:
            print(f"✗ 删除表时出错: {e}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='用户管理系统数据库迁移脚本')
    parser.add_argument('action', choices=['create', 'drop'], help='执行的操作')
    
    if len(sys.argv) == 1:
        # 默认执行创建
        create_tables()
    else:
        args = parser.parse_args()
        
        if args.action == 'create':
            create_tables()
        elif args.action == 'drop':
            drop_tables()