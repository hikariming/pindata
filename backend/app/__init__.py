from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flasgger import Swagger
import logging

from app.db import db, init_database
from app.api.v1 import api_v1
from app.api.v1.endpoints.libraries import libraries_bp
from app.api.v1.endpoints.llm_configs import llm_configs_bp
from app.api.v1.endpoints.system_logs import system_logs_bp
from app.api.v1.endpoints.conversion_jobs import conversion_jobs_bp
from app.api.v1.endpoints.storage import storage_bp
from app.api.v1.endpoints.health import health_bp
from config.config import config

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_app(config_name='development'):
    """应用工厂函数"""
    app = Flask(__name__)
    
    # 加载配置
    app.config.from_object(config[config_name])
    
    # 初始化扩展
    db.init_app(app)
    CORS(app, 
         origins=["*"],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization', 'X-Requested-With'],
         supports_credentials=True)
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
    
    # 初始化数据库（包括自动创建数据库和表）
    try:
        if init_database(app):
            logger.info("数据库初始化成功")
        else:
            logger.error("数据库初始化失败，但应用将继续启动")
    except Exception as e:
        logger.error(f"数据库初始化异常: {e}")
        # 作为备用方案，尝试传统的表创建方式
        try:
            with app.app_context():
                db.create_all()
                logger.info("使用备用方案创建数据库表成功")
        except Exception as fallback_error:
            logger.error(f"备用方案也失败: {fallback_error}")
    
    return app 