import click
from flask.cli import with_appcontext
from app.db import db
from app.models import Permission, Role, RolePermission, User, UserRole
from sqlalchemy.exc import IntegrityError
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# A comprehensive list of permissions for the system
PERMISSIONS = [
    {'code': 'system.manage', 'name': '系统管理', 'category': 'system'},
    {'code': 'user.manage', 'name': '用户管理', 'category': 'user'},
    {'code': 'organization.manage', 'name': '组织管理', 'category': 'organization'},
    {'code': 'role.manage', 'name': '角色管理', 'category': 'role'},
    {'code': 'dataset.create', 'name': '创建数据集', 'category': 'dataset'},
    {'code': 'dataset.read', 'name': '查看数据集', 'category': 'dataset'},
    {'code': 'dataset.update', 'name': '编辑数据集', 'category': 'dataset'},
    {'code': 'dataset.delete', 'name': '删除数据集', 'category': 'dataset'},
    {'code': 'dataset.manage', 'name': '管理数据集', 'category': 'dataset'},
    {'code': 'library.create', 'name': '创建文件库', 'category': 'library'},
    {'code': 'library.read', 'name': '查看文件库', 'category': 'library'},
    {'code': 'library.update', 'name': '编辑文件库', 'category': 'library'},
    {'code': 'library.delete', 'name': '删除文件库', 'category': 'library'},
    {'code': 'library.manage', 'name': '管理文件库', 'category': 'library'},
    {'code': 'task.create', 'name': '创建任务', 'category': 'task'},
    {'code': 'task.read', 'name': '查看任务', 'category': 'task'},
    {'code': 'task.manage', 'name': '管理任务', 'category': 'task'},
    {'code': 'governance.create', 'name': '创建数据治理工程', 'category': 'governance'},
    {'code': 'governance.read', 'name': '查看数据治理工程', 'category': 'governance'},
    {'code': 'governance.update', 'name': '编辑数据治理工程', 'category': 'governance'},
    {'code': 'governance.delete', 'name': '删除数据治理工程', 'category': 'governance'},
    {'code': 'governance.manage', 'name': '管理数据治理工程', 'category': 'governance'},
    {'code': 'llm_config.manage', 'name': 'LLM配置管理', 'category': 'llm'},
    {'code': 'system_log.read', 'name': '查看系统日志', 'category': 'system'},
]

ROLES = [
    {'code': 'admin', 'name': '管理员', 'description': '系统管理员，拥有所有权限'},
    {'code': 'user', 'name': '普通用户', 'description': '普通用户，拥有基本的数据操作权限'},
    {'code': 'viewer', 'name': '访客', 'description': '只读访客，只能查看公开数据'},
]

@click.command('init-db')
@with_appcontext
def init_db_command():
    """Initializes the database with necessary roles and permissions."""
    logger.info("Starting database initialization...")
    try:
        # Check if initialization is needed
        if Permission.query.filter_by(code='system.manage').first():
            logger.info("Permissions already exist. Skipping role/permission creation.")
        else:
            logger.info("No permissions found. Initializing roles and permissions...")
            # Create Permissions
            for p_data in PERMISSIONS:
                permission = Permission(name=p_data['name'], code=p_data['code'], category=p_data['category'], description=f"{p_data['name']}的权限")
                db.session.add(permission)
            
            # Create Roles
            for r_data in ROLES:
                role = Role(name=r_data['name'], code=r_data['code'], description=r_data['description'])
                db.session.add(role)

            db.session.commit()

            # Grant all permissions to admin role
            admin_role = Role.query.filter_by(code='admin').first()
            all_permissions = Permission.query.all()
            if admin_role and all_permissions:
                for perm in all_permissions:
                    rp = RolePermission(role_id=admin_role.id, permission_id=perm.id)
                    db.session.add(rp)
                logger.info("All permissions granted to admin role.")

            db.session.commit()
            logger.info("Database roles and permissions initialized successfully.")

        # Fix users without roles
        logger.info("Checking for users without roles...")
        admin_role = Role.query.filter_by(code='admin').first()
        if not admin_role:
            logger.error("Admin role not found. Cannot assign roles to users.")
            return

        users_without_roles = db.session.query(User).outerjoin(UserRole, User.id == UserRole.user_id).filter(UserRole.user_id == None).all()
        
        if users_without_roles:
            logger.info(f"Found {len(users_without_roles)} users without roles. Assigning 'admin' role to them.")
            for user in users_without_roles:
                user_role = UserRole(user_id=user.id, role_id=admin_role.id)
                db.session.add(user_role)
                logger.info(f"Assigned admin role to user: {user.username}")
            db.session.commit()
        else:
            logger.info("All users have roles. No fixes needed.")
        
        click.echo('Database initialized and users checked successfully.')

    except IntegrityError:
        db.session.rollback()
        logger.warning("Database initialization faced an integrity error (likely from concurrent runs), rolling back.")
    except Exception as e:
        db.session.rollback()
        logger.error(f"An error occurred during database initialization: {e}", exc_info=True)

def register_commands(app):
    app.cli.add_command(init_db_command) 