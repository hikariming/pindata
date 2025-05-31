import os
import json

# 这是一个简化的配置加载器示例
# 实际应用中可能会使用更健壮的库，如 python-dotenv, Dynaconf, 或者 Flask-Config

def load_app_config(config_name='default', config_dir='../config'): # 注意路径相对于此文件
    '''
    加载应用配置。
    默认会尝试加载 default.py, 然后根据 FLASK_ENV 环境变量加载对应的配置 (development.py 或 production.py)
    环境变量中的配置会覆盖文件中的配置。
    '''
    
    # 确定配置文件路径
    base_path = os.path.dirname(os.path.abspath(__file__))
    resolved_config_dir = os.path.join(base_path, config_dir)

    app_config = {}

    # 1. 加载 default.py
    default_config_file = os.path.join(resolved_config_dir, 'default.py')
    if os.path.exists(default_config_file):
        try:
            with open(default_config_file, 'r') as f:
                # 假设 default.py 包含 Python 字典形式的配置
                # 注意：直接 exec/eval 来自不可信文件的内容是不安全的
                # 更安全的方式是使用 .env 文件或 JSON/YAML 配置文件
                # 此处仅为简化示例，假设 config 文件内容是安全的
                config_content = f.read()
                # 模拟加载，实际应用中应避免 eval
                # app_config.update(eval(config_content)) 
                print(f"Mock loading from {default_config_file}")
                if "SECRET_KEY" in config_content: app_config["SECRET_KEY"] = "mock_default_secret"
        except Exception as e:
            print(f"Error loading default config: {e}")
    
    # 2. 根据环境加载特定配置 (development.py, production.py)
    env = os.getenv('FLASK_ENV', config_name) # 如果没设置 FLASK_ENV，则使用传入的 config_name
    env_config_file = os.path.join(resolved_config_dir, f'{env}.py')
    if os.path.exists(env_config_file):
        try:
            with open(env_config_file, 'r') as f:
                # config_content = f.read()
                # app_config.update(eval(config_content))
                print(f"Mock loading from {env_config_file}")
                if "DATABASE_URL" in config_content: app_config["DATABASE_URL"] = f"mock_{env}_db_url"
        except Exception as e:
            print(f"Error loading {env} config: {e}")

    # 3. 从环境变量加载 (覆盖文件配置)
    # 例如: app_config['SECRET_KEY'] = os.getenv('SECRET_KEY', app_config.get('SECRET_KEY'))
    # app_config['DATABASE_URL'] = os.getenv('DATABASE_URL', app_config.get('DATABASE_URL'))
    if os.getenv('SECRET_KEY'): app_config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    if os.getenv('DATABASE_URL'): app_config['DATABASE_URL'] = os.getenv('DATABASE_URL')
    
    print(f"Final mock config loaded: {app_config}")
    return app_config

# 示例用法:
# if __name__ == '__main__':
#     # 需要在 backend/app/utils 目录下运行此脚本，或者调整 config_dir 路径
#     # 并确保 ../config/default.py 等文件存在且包含字典
#     # 例如 ../config/default.py 内容: {"SECRET_KEY": "mydefaultsecret"}
#     # 例如 ../config/development.py 内容: {"DATABASE_URL": "dev_db_url", "DEBUG": True}
    
#     # 创建模拟配置文件以便测试
#     mock_config_path = os.path.join(os.path.dirname(__file__), '../config')
#     os.makedirs(mock_config_path, exist_ok=True)
#     with open(os.path.join(mock_config_path, 'default.py'), 'w') as f:
#         f.write('{"SECRET_KEY": "default_secret_from_file"}')
#     with open(os.path.join(mock_config_path, 'development.py'), 'w') as f:
#         f.write('{"DATABASE_URL": "dev_db_from_file", "DEBUG": True}')
        
#     cfg = load_app_config('development')
#     print(f"Loaded SECRET_KEY: {cfg.get('SECRET_KEY')}")
#     print(f"Loaded DATABASE_URL: {cfg.get('DATABASE_URL')}")
#     print(f"Loaded DEBUG: {cfg.get('DEBUG')}")

#     # 清理模拟文件
#     shutil.rmtree(mock_config_path) 