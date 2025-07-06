from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flasgger import Swagger
import logging
from sqlalchemy import text
import time
from flask import g

from app.db import db, init_database
from app.api.v1 import api_v1
from app.api.v1.endpoints.libraries import libraries_bp
from app.api.v1.endpoints.llm_configs import llm_configs_bp
from app.api.v1.endpoints.system_logs import system_logs_bp
from app.api.v1.endpoints.conversion_jobs import conversion_jobs_bp
from app.api.v1.endpoints.storage import storage_bp
from app.api.v1.endpoints.health import health_bp
from app.api.v1.endpoints.auth import auth_bp
from app.api.v1.endpoints.users import users_bp
from app.api.v1.endpoints.organizations import organizations_bp
from app.api.v1.endpoints.roles import roles_bp
from app.api.v1.endpoints.data_governance import data_governance_bp
from app.api.v1.endpoints.dataflow import dataflow_bp
from config.config import config, get_config
from app.db import ensure_database_exists
from app.utils.db_utils import is_new_database, stamp_db_as_latest
from .celery_app import celery

# 配置日志
# logging.basicConfig(
#     level=logging.INFO,
#     format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
# )

# 获取根日志记录器
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# 创建一个输出到控制台的处理器
handler = logging.StreamHandler()
handler.setLevel(logging.INFO)

# 创建一个格式化器并将其添加到处理器
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)

# 将处理器添加到根日志记录器
if not logger.handlers:
    logger.addHandler(handler)

logger = logging.getLogger(__name__)

def create_app(config_name='default'):
    """应用工厂函数"""
    app = Flask(__name__)
    
    # 加载配置
    config = get_config(config_name)
    app.config.from_object(config)
    
    # 初始化扩展
    db.init_app(app)
    CORS(app, supports_credentials=True)
    JWTManager(app)
    
    # 初始化Swagger
    app.config['SWAGGER'] = {
        'title': 'pindata API',
        'uiversion': 3,
        'version': '1.0.0',
        'description': '大模型训练数据集管理系统API'
    }
    Swagger(app)
    
    # 注册蓝图
    app.register_blueprint(api_v1, url_prefix=app.config.get('API_PREFIX', '/api/v1'))
    app.register_blueprint(libraries_bp, url_prefix=app.config.get('API_PREFIX', '/api/v1'))
    app.register_blueprint(llm_configs_bp, url_prefix=f"{app.config.get('API_PREFIX', '/api/v1')}/llm")
    app.register_blueprint(system_logs_bp, url_prefix=f"{app.config.get('API_PREFIX', '/api/v1')}/system")
    app.register_blueprint(conversion_jobs_bp, url_prefix=app.config.get('API_PREFIX', '/api/v1'))
    app.register_blueprint(storage_bp, url_prefix=app.config.get('API_PREFIX', '/api/v1'))
    app.register_blueprint(health_bp, url_prefix=app.config.get('API_PREFIX', '/api/v1'))
    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(users_bp, url_prefix='/api/v1/users')
    app.register_blueprint(data_governance_bp, url_prefix='/api/v1')
    app.register_blueprint(dataflow_bp, url_prefix='/api/v1/dataflow')
    
    # 注册任务状态查询蓝图
    from app.api.v1.endpoints.tasks import tasks_bp
    app.register_blueprint(tasks_bp, url_prefix=app.config.get('API_PREFIX', '/api/v1'))
    
    # 注册CLI命令
    from app.core.initialization import register_commands, ensure_default_organization
    register_commands(app)

    @app.before_request
    def before_request():
        g.request_start_time = time.time()
    
    # 初始化数据库
    try:
        database_url = app.config['SQLALCHEMY_DATABASE_URI']
        
        # 1. 确保数据库本身存在 (例如 postgresql 里的 database)
        if not ensure_database_exists(database_url):
            logger.warning("无法确认数据库存在，应用将继续尝试启动...")

        with app.app_context():
            # 2. 判断是否为全新安装
            if is_new_database(db.engine):
                logger.info("检测到全新数据库，开始初始化...")
                try:
                    # 创建所有表
                    db.create_all()
                    logger.info("✅ 成功创建所有数据库表")
                    
                    # 将数据库标记为最新，避免执行旧迁移
                    if stamp_db_as_latest(app):
                        logger.info("✅ 成功将数据库标记为最新版本")
                    else:
                        logger.error("❌ 标记数据库为最新版本失败")

                    # 确保默认组织存在
                    ensure_default_organization()

                    logger.info("🎉 全新数据库初始化完成")

                except Exception as e:
                    logger.error(f"❌ 初始化全新数据库时发生错误: {e}", exc_info=True)
            else:
                logger.info("检测到现有数据库，Alembic迁移将在run.py中执行...")
                # 确保默认组织存在
                ensure_default_organization()

    except Exception as e:
        logger.error(f"数据库设置过程中发生严重错误: {e}", exc_info=True)

    # Celery配置已在celery_app.py中完成，无需重复配置

    return app 