import os
from app import create_app

# 获取环境配置
config_name = os.getenv('FLASK_ENV', 'development')

# 创建应用实例
app = create_app(config_name)

if __name__ == '__main__':
    # 启动应用
    app.run(
        host='0.0.0.0',
        port=8897,
        debug=app.config.get('DEBUG', False)
    )