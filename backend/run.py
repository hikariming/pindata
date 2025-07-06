import os
import sys
import psycopg2
import redis
from urllib.parse import urlparse
from minio import Minio
from dotenv import load_dotenv
from app import create_app
from alembic.config import Config
from alembic import command

# 确保加载环境变量
load_dotenv()

def check_database_connection():
    """检查数据库连接"""
    try:
        db_url = os.getenv('DATABASE_URL')
        if not db_url:
            print("❌ 环境变量 DATABASE_URL 未设置")
            return False
            
        # 解析数据库URL
        parsed = urlparse(db_url)
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port,
            user=parsed.username,
            password=parsed.password,
            database=parsed.path.lstrip('/')
        )
        conn.close()
        print(f"✅ 数据库连接成功: {parsed.hostname}:{parsed.port}")
        return True
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return False

def check_redis_connection():
    """检查Redis连接"""
    try:
        redis_url = os.getenv('REDIS_URL')
        if not redis_url:
            print("❌ 环境变量 REDIS_URL 未设置")
            return False
            
        r = redis.from_url(redis_url)
        r.ping()
        parsed = urlparse(redis_url)
        print(f"✅ Redis连接成功: {parsed.hostname}:{parsed.port}")
        return True
    except Exception as e:
        print(f"❌ Redis连接失败: {e}")
        return False

def check_minio_connection():
    """检查MinIO连接"""
    try:
        endpoint = os.getenv('MINIO_ENDPOINT')
        access_key = os.getenv('MINIO_ACCESS_KEY')
        secret_key = os.getenv('MINIO_SECRET_KEY')
        secure = os.getenv('MINIO_SECURE', 'false').lower() == 'true'
        
        if not all([endpoint, access_key, secret_key]):
            print("❌ MinIO环境变量未完整设置")
            return False
            
        client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=secure)
        # 尝试列出存储桶来验证连接
        list(client.list_buckets())
        print(f"✅ MinIO连接成功: {endpoint}")
        return True
    except Exception as e:
        print(f"❌ MinIO连接失败: {e}")
        return False

# 获取环境配置
config_name = os.getenv('FLASK_ENV', 'development')

# 创建应用实例
app = create_app(config_name)

if __name__ == '__main__':
    # 启动前检查所有连接
    print("🔍 检查服务连接...")
    
    db_ok = check_database_connection()
    redis_ok = check_redis_connection()
    minio_ok = check_minio_connection()
    
    if not all([db_ok, redis_ok, minio_ok]):
        print("❌ 服务连接检查失败，请检查配置和网络连接")
        sys.exit(1)
    
    print("✅ 所有服务连接检查通过")
    
    # 执行数据库迁移
    # 获取当前文件所在目录（backend目录）
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    # 获取项目根目录
    project_root = os.path.dirname(backend_dir)
    # alembic.ini 在项目根目录
    alembic_ini_path = os.path.join(project_root, "alembic.ini")
    
    # 确保 alembic.ini 文件存在
    if not os.path.exists(alembic_ini_path):
        print(f"❌ 找不到 alembic.ini 文件: {alembic_ini_path}")
        print(f"当前工作目录: {os.getcwd()}")
        print(f"backend目录: {backend_dir}")
        print(f"项目根目录: {project_root}")
        exit(1)
    
    alembic_cfg = Config(alembic_ini_path)
    # 设置正确的脚本位置，使用绝对路径
    alembic_script_location = os.path.join(backend_dir, "alembic")
    alembic_cfg.set_main_option("script_location", alembic_script_location)
    
    print("📊 执行数据库迁移...")
    command.upgrade(alembic_cfg, "head")
    print("✅ 数据库迁移完成")

    # 启动应用
    print(f"🚀 启动 Flask 应用...")
    print(f"   - 主机: 0.0.0.0")
    print(f"   - 端口: 8897")
    print(f"   - 调试模式: {app.config.get('DEBUG', False)}")
    print(f"   - 环境: {config_name}")
    
    app.run(
        host='0.0.0.0',
        port=8897,
        debug=app.config.get('DEBUG', False)
    )