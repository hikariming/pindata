-- 用户权限系统基础数据初始化SQL脚本
-- 可以单独执行此脚本来初始化权限数据

-- 1. 插入系统权限
INSERT INTO permissions (id, name, code, resource, action, description, category, type, created_at) VALUES
-- 系统管理权限
(UUID(), '系统管理', 'system.manage', 'system', 'manage', '系统全局管理权限', 'system', 'system', NOW()),
(UUID(), '用户管理', 'user.manage', 'user', 'manage', '用户管理权限', 'user', 'system', NOW()),
(UUID(), '组织管理', 'organization.manage', 'organization', 'manage', '组织架构管理权限', 'organization', 'system', NOW()),
(UUID(), '角色管理', 'role.manage', 'role', 'manage', '角色和权限管理权限', 'role', 'system', NOW()),

-- 数据集权限
(UUID(), '创建数据集', 'dataset.create', 'dataset', 'create', '创建新数据集的权限', 'dataset', 'system', NOW()),
(UUID(), '查看数据集', 'dataset.read', 'dataset', 'read', '查看数据集的权限', 'dataset', 'system', NOW()),
(UUID(), '编辑数据集', 'dataset.update', 'dataset', 'update', '编辑数据集的权限', 'dataset', 'system', NOW()),
(UUID(), '删除数据集', 'dataset.delete', 'dataset', 'delete', '删除数据集的权限', 'dataset', 'system', NOW()),
(UUID(), '管理数据集', 'dataset.manage', 'dataset', 'manage', '数据集管理权限（包含所有操作）', 'dataset', 'system', NOW()),

-- 文件库权限
(UUID(), '创建文件库', 'library.create', 'library', 'create', '创建新文件库的权限', 'library', 'system', NOW()),
(UUID(), '查看文件库', 'library.read', 'library', 'read', '查看文件库的权限', 'library', 'system', NOW()),
(UUID(), '编辑文件库', 'library.update', 'library', 'update', '编辑文件库的权限', 'library', 'system', NOW()),
(UUID(), '删除文件库', 'library.delete', 'library', 'delete', '删除文件库的权限', 'library', 'system', NOW()),
(UUID(), '管理文件库', 'library.manage', 'library', 'manage', '文件库管理权限（包含所有操作）', 'library', 'system', NOW()),

-- 任务权限
(UUID(), '创建任务', 'task.create', 'task', 'create', '创建新任务的权限', 'task', 'system', NOW()),
(UUID(), '查看任务', 'task.read', 'task', 'read', '查看任务的权限', 'task', 'system', NOW()),
(UUID(), '管理任务', 'task.manage', 'task', 'manage', '任务管理权限', 'task', 'system', NOW()),

-- LLM配置权限
(UUID(), 'LLM配置管理', 'llm_config.manage', 'llm_config', 'manage', 'LLM配置管理权限', 'llm', 'system', NOW()),

-- 系统日志权限
(UUID(), '查看系统日志', 'system_log.read', 'system_log', 'read', '查看系统日志的权限', 'system', 'system', NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 2. 插入系统角色
INSERT INTO roles (id, name, code, description, type, status, created_at, updated_at) VALUES
(UUID(), '超级管理员', 'super_admin', '系统超级管理员，拥有所有权限', 'system', 'active', NOW(), NOW()),
(UUID(), '系统管理员', 'admin', '系统管理员，拥有大部分管理权限', 'system', 'active', NOW(), NOW()),
(UUID(), '数据管理员', 'data_admin', '数据管理员，可以管理数据集和文件库', 'system', 'active', NOW(), NOW()),
(UUID(), '普通用户', 'user', '普通用户，可以创建和管理自己的数据', 'system', 'active', NOW(), NOW()),
(UUID(), '访客', 'viewer', '只读访客，只能查看公开数据', 'system', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 3. 创建默认组织
INSERT INTO organizations (id, name, code, description, path, level, sort_order, status, created_at, updated_at) VALUES
(UUID(), '系统默认组织', 'root', '系统默认根组织', '/root', 1, 0, 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- 4. 角色权限分配
-- 超级管理员角色权限
INSERT INTO role_permissions (id, role_id, permission_id, granted_at)
SELECT UUID(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.code = 'super_admin' 
AND p.code IN ('system.manage', 'user.manage', 'organization.manage', 'role.manage')
ON DUPLICATE KEY UPDATE granted_at=VALUES(granted_at);

-- 系统管理员角色权限
INSERT INTO role_permissions (id, role_id, permission_id, granted_at)
SELECT UUID(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.code = 'admin' 
AND p.code IN ('user.manage', 'organization.manage', 'dataset.manage', 'library.manage', 'task.manage')
ON DUPLICATE KEY UPDATE granted_at=VALUES(granted_at);

-- 数据管理员角色权限
INSERT INTO role_permissions (id, role_id, permission_id, granted_at)
SELECT UUID(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.code = 'data_admin' 
AND p.code IN ('dataset.manage', 'library.manage', 'task.manage', 'llm_config.manage')
ON DUPLICATE KEY UPDATE granted_at=VALUES(granted_at);

-- 普通用户角色权限
INSERT INTO role_permissions (id, role_id, permission_id, granted_at)
SELECT UUID(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.code = 'user' 
AND p.code IN ('dataset.create', 'dataset.read', 'dataset.update', 'library.create', 'library.read', 'library.update', 'task.create', 'task.read')
ON DUPLICATE KEY UPDATE granted_at=VALUES(granted_at);

-- 访客角色权限
INSERT INTO role_permissions (id, role_id, permission_id, granted_at)
SELECT UUID(), r.id, p.id, NOW()
FROM roles r, permissions p
WHERE r.code = 'viewer' 
AND p.code IN ('dataset.read', 'library.read', 'task.read')
ON DUPLICATE KEY UPDATE granted_at=VALUES(granted_at);

-- 5. 创建默认管理员用户（如果不存在）
INSERT INTO users (id, username, email, password_hash, full_name, status, created_at, updated_at)
SELECT UUID(), 'admin', 'admin@pindata.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewJfajnIgQOT1.9G', '系统管理员', 'active', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- 6. 为管理员用户分配角色和组织
-- 分配超级管理员角色
INSERT INTO user_roles (id, user_id, role_id, granted_at, status)
SELECT UUID(), u.id, r.id, NOW(), 'active'
FROM users u, roles r
WHERE u.username = 'admin' AND r.code = 'super_admin'
AND NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = u.id AND ur.role_id = r.id
);

-- 加入默认组织
INSERT INTO user_organizations (id, user_id, organization_id, is_primary, position, status, created_at, updated_at)
SELECT UUID(), u.id, o.id, TRUE, '系统管理员', 'active', NOW(), NOW()
FROM users u, organizations o
WHERE u.username = 'admin' AND o.code = 'root'
AND NOT EXISTS (
    SELECT 1 FROM user_organizations uo 
    WHERE uo.user_id = u.id AND uo.organization_id = o.id
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_organizations_code ON organizations(code);
CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_user_id ON resource_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_resource ON resource_permissions(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(access_token_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 显示初始化完成信息
SELECT '用户权限系统初始化完成！' as message;
SELECT '默认管理员账号:' as info, 'admin' as username, 'admin123' as password, 'admin@pindata.com' as email;