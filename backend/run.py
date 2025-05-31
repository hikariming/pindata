import os
from dotenv import load_dotenv

# 在导入应用和其他模块之前加载环境变量
# 这样，应用内部和配置加载器就能访问到 .env 文件中定义的值
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../.env') # 指向项目根目录的 .env
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
    print(f"Loaded environment variables from: {dotenv_path}")
else:
    print(f".env file not found at {dotenv_path}, ensure it exists or set environment variables manually.")

from app import create_app
# from app.utils.config_loader import load_app_config # 如果配置在 app 创建时加载

# 根据 FLASK_ENV 环境变量选择配置 (例如 'development', 'production')
# config_name = os.getenv('FLASK_ENV', 'development') 
# app_config = load_app_config(config_name) # 如果配置加载器在此处使用

# 创建 Flask 应用实例
# 如果 create_app 需要配置对象，则传递它
# app = create_app(config_object=app_config) 或者 app = create_app(config_name)

app = create_app() # 假设 create_app 内部处理配置加载

if __name__ == '__main__':
    # 获取主机和端口配置，可以从环境变量或应用配置中获取
    host = os.getenv('FLASK_RUN_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_RUN_PORT', 5000))
    debug_mode = app.config.get('DEBUG', False) # 从应用配置中获取 DEBUG 状态

    print(f"Starting Flask app on {host}:{port} with debug_mode={debug_mode}")
    app.run(host=host, port=port, debug=debug_mode) 