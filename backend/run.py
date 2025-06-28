import os
from app import create_app
from alembic.config import Config
from alembic import command

# 获取环境配置
config_name = os.getenv('FLASK_ENV', 'development')

# 创建应用实例
app = create_app(config_name)

if __name__ == '__main__':
    # 执行数据库迁移
    # 获取项目根目录的 alembic.ini 路径
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    alembic_ini_path = os.path.join(project_root, "alembic.ini")
    
    alembic_cfg = Config(alembic_ini_path)
    # 设置正确的脚本位置，相对于项目根目录
    alembic_cfg.set_main_option("script_location", os.path.join(project_root, "backend", "alembic"))
    
    command.upgrade(alembic_cfg, "head")

    # 启动应用
    app.run(
        host='0.0.0.0',
        port=8897,
        debug=app.config.get('DEBUG', False)
    )