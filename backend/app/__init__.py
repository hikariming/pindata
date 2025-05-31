'''
Flask 应用初始化模块
'''

from flask import Flask

def create_app():
    app = Flask(__name__)

    # 在这里注册蓝图、配置等
    # from .routes import main_bp
    # app.register_blueprint(main_bp)

    return app 