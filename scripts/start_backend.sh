#!/bin/bash

# scripts/start_backend.sh
# 启动后端开发服务器的脚本

# 获取脚本所在的目录
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PROJECT_ROOT=$( cd -- "$SCRIPT_DIR/.." &> /dev/null && pwd )
BACKEND_DIR="$PROJECT_ROOT/backend"

echo "Project root: $PROJECT_ROOT"
echo "Backend directory: $BACKEND_DIR"

# 检查 .env 文件是否存在于项目根目录
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "Warning: .env file not found in project root ($PROJECT_ROOT/.env)."
    echo "Backend might not start correctly or use default configurations."
    echo "Consider creating it from .env.example (if available)."
fi

cd "$BACKEND_DIR"

# 检查 Python 虚拟环境是否存在
if [ ! -d "venv" ]; then
    echo "Python virtual environment 'venv' not found in $BACKEND_DIR."
    echo "Please run the following commands first:"
    echo "  cd $BACKEND_DIR"
    echo "  python3 -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    echo "  deactivate (optional, after installation)"
    exit 1
fi

# 激活虚拟环境
source venv/bin/activate
echo "Python virtual environment activated."

# 检查依赖是否安装 (简单检查 Flask 是否可导入)
if ! python -c "import flask" &> /dev/null; then
    echo "Flask (or other dependencies) not found in virtual environment."
    echo "Please ensure requirements are installed: pip install -r requirements.txt"
    deactivate
    exit 1
fi

# 设置 FLASK_APP 和 FLASK_ENV (如果 .env 文件中没有或者需要覆盖)
export FLASK_APP=run.py  # 指向你的 Flask 启动文件
export FLASK_ENV=${FLASK_ENV:-development} # 默认为 development

echo "FLASK_APP set to $FLASK_APP"
echo "FLASK_ENV set to $FLASK_ENV"

# 运行 Flask 开发服务器
# flask run --host=0.0.0.0 --port=5000 (这是 README 中的命令)
# 或者直接执行 run.py (如果 run.py 内部处理了 app.run())

echo "Starting Flask development server... (using python run.py)"
python run.py

# 当服务器停止后 (例如 Ctrl+C)

# 停用虚拟环境
deactivate
echo "Python virtual environment deactivated."

echo "Backend server stopped." 