#!/usr/bin/env python3
"""
v1.0.0 创建用户管理系统

这个迁移创建完整的用户管理系统，包括：
- 用户基本信息表
- 角色权限系统
- 会话管理
- 审计日志

适用场景：从没有用户系统升级到有用户系统
"""

from sqlalchemy import text
from datetime import datetime
import uuid
from werkzeug.security import generate_password_hash

MIGRATION_VERSION = "v1.0.0"
MIGRATION_DESCRIPTION = "创建用户管理系统"
MIGRATION_AUTHOR = "系统"
MIGRATION_DATE = datetime.now().isoformat()

def up(conn):
    """创建用户管理系统"""
    print(f"执行迁移: {MIGRATION_DESCRIPTION}")
    
    # 1. 创建用户状态枚举类型
    print("创建用户状态枚举...")
    try:
        conn.execute(text("CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED')"))
    except Exception:
        # 枚举类型已存在
        pass
    
    # 2. 创建组织表
    print("创建组织表...")
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS organizations (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(36),
            updated_by VARCHAR(36)
        )
    """))
    
    # 3. 创建用户表
    print("创建用户表...")
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
            username VARCHAR(100) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(255),
            avatar_url TEXT,
            phone VARCHAR(50),
            status user_status NOT NULL DEFAULT 'ACTIVE',
            last_login_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(36),
            updated_by VARCHAR(36)
        )
    """))
    
    # 4. 创建角色表
    print("创建角色表...")
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS roles (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) NOT NULL,
            description TEXT,
            organization_id VARCHAR(36),
            type VARCHAR(20) NOT NULL DEFAULT 'CUSTOM',
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(36),
            updated_by VARCHAR(36),
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
            UNIQUE(code, organization_id)
        )
    """))
    
    # 5. 创建权限表
    print("创建权限表...")
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS permissions (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) UNIQUE NOT NULL,
            description TEXT,
            category VARCHAR(100),
            is_system_permission BOOLEAN NOT NULL DEFAULT false,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """))
    
    # 6. 创建用户角色关联表
    print("创建用户角色关联表...")
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS user_roles (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
            user_id VARCHAR(36) NOT NULL,
            role_id VARCHAR(36) NOT NULL,
            organization_id VARCHAR(36),
            granted_by VARCHAR(36),
            granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
            UNIQUE(user_id, role_id, organization_id)
        )
    """))
    
    # 7. 创建角色权限关联表
    print("创建角色权限关联表...")
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS role_permissions (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
            role_id VARCHAR(36) NOT NULL,
            permission_id VARCHAR(36) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(36),
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
            UNIQUE(role_id, permission_id)
        )
    """))
    
    # 8. 创建用户组织关联表
    print("创建用户组织关联表...")
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS user_organizations (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
            user_id VARCHAR(36) NOT NULL,
            organization_id VARCHAR(36) NOT NULL,
            position VARCHAR(255),
            is_primary BOOLEAN NOT NULL DEFAULT false,
            joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(36),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
            UNIQUE(user_id, organization_id)
        )
    """))
    
    # 9. 创建用户会话表
    print("创建用户会话表...")
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
            user_id VARCHAR(36) NOT NULL,
            access_token_hash VARCHAR(255) UNIQUE NOT NULL,
            refresh_token_hash VARCHAR(255) UNIQUE NOT NULL,
            device_info TEXT,
            ip_address VARCHAR(45),
            user_agent TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """))
    
    # 10. 创建审计日志表
    print("创建审计日志表...")
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
            user_id VARCHAR(36),
            organization_id VARCHAR(36),
            action VARCHAR(255) NOT NULL,
            resource_type VARCHAR(100) NOT NULL,
            resource_id VARCHAR(36),
            old_values TEXT,
            new_values TEXT,
            ip_address VARCHAR(45),
            user_agent TEXT,
            request_id VARCHAR(255),
            status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
            error_message TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
        )
    """))
    
    # 11. 创建索引
    print("创建索引...")
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
        "CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)",
        "CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(access_token_hash)",
        "CREATE INDEX IF NOT EXISTS idx_user_sessions_refresh_token ON user_sessions(refresh_token_hash)",
        "CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions(status)",
        "CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)",
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)"
    ]
    
    for index_sql in indexes:
        try:
            conn.execute(text(index_sql))
        except Exception:
            # 索引可能已存在
            pass
    
    # 12. 插入初始数据
    print("插入初始数据...")
    
    # 插入默认组织
    conn.execute(text("""
        INSERT INTO organizations (id, name, code, description) 
        SELECT gen_random_uuid()::text, 'System Organization', 'SYSTEM', 'Default system organization'
        WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE code = 'SYSTEM')
    """))
    
    # 插入系统权限
    permissions_data = [
        ('System Management', 'system.manage', 'Complete system administration', 'system'),
        ('User Management', 'user.manage', 'Manage users and their access', 'user'),
        ('Organization Management', 'organization.manage', 'Manage organizations', 'organization'),
        ('Role Management', 'role.manage', 'Manage roles and permissions', 'role'),
        ('Dataset Create', 'dataset.create', 'Create new datasets', 'dataset'),
        ('Dataset Read', 'dataset.read', 'View and access datasets', 'dataset'),
        ('Dataset Update', 'dataset.update', 'Modify existing datasets', 'dataset'),
        ('Dataset Delete', 'dataset.delete', 'Delete datasets', 'dataset'),
        ('Dataset Management', 'dataset.manage', 'Full dataset management', 'dataset'),
        ('Library Create', 'library.create', 'Create new libraries', 'library'),
        ('Library Read', 'library.read', 'View and access libraries', 'library'),
        ('Library Update', 'library.update', 'Modify existing libraries', 'library'),
        ('Library Delete', 'library.delete', 'Delete libraries', 'library'),
        ('Library Management', 'library.manage', 'Full library management', 'library'),
        ('Task Create', 'task.create', 'Create new tasks', 'task'),
        ('Task Read', 'task.read', 'View task information', 'task'),
        ('Task Management', 'task.manage', 'Full task management', 'task'),
        ('LLM Config Management', 'llm_config.manage', 'Manage LLM configurations', 'system'),
        ('System Log Read', 'system_log.read', 'View system logs', 'system')
    ]
    
    for name, code, desc, category in permissions_data:
        conn.execute(text("""
            INSERT INTO permissions (name, code, description, category, is_system_permission)
            SELECT :name, :code, :desc, :category, true
            WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = :code)
        """), {'name': name, 'code': code, 'desc': desc, 'category': category})
    
    # 插入系统角色
    roles_data = [
        ('Super Administrator', 'super_admin', 'System super administrator with all permissions'),
        ('Administrator', 'admin', 'System administrator'),
        ('Data Administrator', 'data_admin', 'Data and dataset administrator'),
        ('User', 'user', 'Regular system user'),
        ('Viewer', 'viewer', 'Read-only access user')
    ]
    
    for name, code, desc in roles_data:
        conn.execute(text("""
            INSERT INTO roles (name, code, description, type)
            SELECT :name, :code, :desc, 'SYSTEM'
            WHERE NOT EXISTS (
                SELECT 1 FROM roles WHERE code = :code AND type = 'SYSTEM'
            )
        """), {'name': name, 'code': code, 'desc': desc})
    
    # 为角色分配权限
    print("配置角色权限...")
    
    # 超级管理员获得所有权限
    conn.execute(text("""
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT r.id, p.id 
        FROM roles r, permissions p 
        WHERE r.code = 'super_admin' AND r.type = 'SYSTEM'
        AND NOT EXISTS (
            SELECT 1 FROM role_permissions rp 
            WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    """))
    
    # 管理员权限
    admin_permissions = [
        'user.manage', 'organization.manage', 'dataset.manage', 
        'library.manage', 'task.manage', 'system_log.read'
    ]
    
    for perm in admin_permissions:
        conn.execute(text("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id 
            FROM roles r, permissions p 
            WHERE r.code = 'admin' AND r.type = 'SYSTEM'
            AND p.code = :perm
            AND NOT EXISTS (
                SELECT 1 FROM role_permissions rp 
                WHERE rp.role_id = r.id AND rp.permission_id = p.id
            )
        """), {'perm': perm})
    
    # 数据管理员权限
    data_admin_permissions = [
        'dataset.manage', 'library.manage', 'task.manage', 'llm_config.manage'
    ]
    
    for perm in data_admin_permissions:
        conn.execute(text("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id 
            FROM roles r, permissions p 
            WHERE r.code = 'data_admin' AND r.type = 'SYSTEM'
            AND p.code = :perm
            AND NOT EXISTS (
                SELECT 1 FROM role_permissions rp 
                WHERE rp.role_id = r.id AND rp.permission_id = p.id
            )
        """), {'perm': perm})
    
    # 普通用户权限
    user_permissions = [
        'dataset.create', 'dataset.read', 'dataset.update',
        'library.create', 'library.read', 'library.update',
        'task.create', 'task.read'
    ]
    
    for perm in user_permissions:
        conn.execute(text("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id 
            FROM roles r, permissions p 
            WHERE r.code = 'user' AND r.type = 'SYSTEM'
            AND p.code = :perm
            AND NOT EXISTS (
                SELECT 1 FROM role_permissions rp 
                WHERE rp.role_id = r.id AND rp.permission_id = p.id
            )
        """), {'perm': perm})
    
    # 查看者权限
    viewer_permissions = ['dataset.read', 'library.read', 'task.read']
    
    for perm in viewer_permissions:
        conn.execute(text("""
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, p.id 
            FROM roles r, permissions p 
            WHERE r.code = 'viewer' AND r.type = 'SYSTEM'
            AND p.code = :perm
            AND NOT EXISTS (
                SELECT 1 FROM role_permissions rp 
                WHERE rp.role_id = r.id AND rp.permission_id = p.id
            )
        """), {'perm': perm})
    
    # 13. 创建默认管理员用户（如果没有用户）
    print("检查是否需要创建默认管理员...")
    result = conn.execute(text("SELECT COUNT(*) FROM users"))
    user_count = result.fetchone()[0]
    
    if user_count == 0:
        print("创建默认管理员用户...")
        admin_id = str(uuid.uuid4())
        password_hash = generate_password_hash('admin123')
        
        # 插入管理员用户
        conn.execute(text("""
            INSERT INTO users (id, username, email, password_hash, full_name, status)
            VALUES (:id, :username, :email, :password_hash, :full_name, 'ACTIVE')
        """), {
            'id': admin_id,
            'username': 'admin',
            'email': 'admin@pindata.com',
            'password_hash': password_hash,
            'full_name': 'System Administrator'
        })
        
        # 获取超级管理员角色ID并分配给用户
        role_result = conn.execute(text("""
            SELECT id FROM roles WHERE code = 'super_admin' AND type = 'SYSTEM'
        """))
        role_row = role_result.fetchone()
        
        if role_row:
            conn.execute(text("""
                INSERT INTO user_roles (user_id, role_id)
                VALUES (:user_id, :role_id)
            """), {'user_id': admin_id, 'role_id': role_row[0]})
            
            print("✅ 默认管理员用户创建完成:")
            print("   用户名: admin")
            print("   密码: admin123")
            print("   邮箱: admin@pindata.com")
    
    print("✅ 用户管理系统创建完成")

def down(conn):
    """回滚用户管理系统"""
    print(f"回滚迁移: {MIGRATION_DESCRIPTION}")
    
    # 按依赖关系逆序删除表
    tables_to_drop = [
        'audit_logs',
        'role_permissions',
        'user_organizations',
        'user_roles',
        'user_sessions',
        'permissions',
        'roles', 
        'users',
        'organizations'
    ]
    
    for table in tables_to_drop:
        print(f"删除表: {table}")
        conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
    
    # 删除枚举类型
    try:
        conn.execute(text("DROP TYPE IF EXISTS user_status CASCADE"))
    except Exception:
        pass
    
    print("✅ 用户管理系统回滚完成")

def get_migration_info():
    """获取迁移信息"""
    return {
        'version': MIGRATION_VERSION,
        'description': MIGRATION_DESCRIPTION,
        'author': MIGRATION_AUTHOR,
        'date': MIGRATION_DATE
    }