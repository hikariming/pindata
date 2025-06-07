from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flasgger import Swagger

from app.db import db
from app.api.v1 import api_v1
from app.api.v1.endpoints.libraries import libraries_bp
from app.api.v1.endpoints.llm_configs import llm_configs_bp
from app.api.v1.endpoints.system_logs import system_logs_bp
from app.api.v1.endpoints.conversion_jobs import conversion_jobs_bp
from app.api.v1.endpoints.storage import storage_bp
from config.config import config

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
    
    # 创建数据库表
    with app.app_context():
        db.create_all()
    
    return app 