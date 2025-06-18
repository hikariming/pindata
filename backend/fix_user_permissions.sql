-- fix_user_permissions.sql (PostgreSQL compatible - v2)
-- This script creates the necessary permission and a role to grant 'governance.read' access
-- to the user 'beiming1201'.

DO $$
DECLARE
    user_id_var UUID;
    role_id_var UUID;
    permission_id_var UUID;
    role_code_var TEXT := 'governance_viewer';
    permission_code_var TEXT := 'governance.read';
BEGIN
    -- Step 1: Find the user's ID
    SELECT id INTO user_id_var FROM users WHERE username = 'beiming1201' LIMIT 1;
    
    IF user_id_var IS NULL THEN
        RAISE NOTICE 'User "beiming1201" not found. Aborting.';
        RETURN;
    END IF;

    -- Step 2: Create the 'governance.read' permission if it doesn't exist
    SELECT id INTO permission_id_var FROM permissions WHERE code = permission_code_var;

    IF permission_id_var IS NULL THEN
        RAISE NOTICE 'Permission "%" not found. Creating it.', permission_code_var;
        INSERT INTO permissions (id, name, code, resource, action, description, category, type)
        VALUES (gen_random_uuid(), '查看数据治理工程', permission_code_var, 'governance', 'read', '查看数据治理工程的权限', 'governance', 'system')
        RETURNING id INTO permission_id_var;
    ELSE
        RAISE NOTICE 'Permission "%" already exists.', permission_code_var;
    END IF;

    -- Step 3: Create the 'governance_viewer' role if it doesn't exist
    SELECT id INTO role_id_var FROM roles WHERE code = role_code_var;

    IF role_id_var IS NULL THEN
        RAISE NOTICE 'Role "%" not found. Creating it.', role_code_var;
        INSERT INTO roles (id, name, code, description, type, status)
        VALUES (gen_random_uuid(), 'Governance Viewer', role_code_var, 'Can view governance projects and stats', 'system', 'active')
        RETURNING id INTO role_id_var;
    ELSE
        RAISE NOTICE 'Role "%" already exists.', role_code_var;
    END IF;
    
    -- Step 4: Link permission to role if not already linked
    IF NOT EXISTS (SELECT 1 FROM role_permissions WHERE role_id = role_id_var AND permission_id = permission_id_var) THEN
        RAISE NOTICE 'Linking permission "%" to role "%".', permission_code_var, role_code_var;
        INSERT INTO role_permissions (id, role_id, permission_id, granted_at)
        VALUES (gen_random_uuid(), role_id_var, permission_id_var, NOW());
    ELSE
        RAISE NOTICE 'Permission "%" already linked to role "%".', permission_code_var, role_code_var;
    END IF;

    -- Step 5: Assign role to user if not already assigned
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = user_id_var AND role_id = role_id_var) THEN
        RAISE NOTICE 'Assigning role "%" to user "beiming1201".', role_code_var;
        INSERT INTO user_roles (id, user_id, role_id, granted_at, status)
        VALUES (gen_random_uuid(), user_id_var, role_id_var, NOW(), 'active');
    ELSE
        RAISE NOTICE 'User "beiming1201" already has role "%".', role_code_var;
    END IF;

    RAISE NOTICE 'Script completed. Please log out and log back in for changes to take effect.';

END $$;

-- Verification query
SELECT 
    u.username, 
    r.name as role_name, 
    p.name as permission_name,
    p.code as permission_code
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.username = 'beiming1201'; 