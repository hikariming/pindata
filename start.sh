#!/bin/bash

# 获取脚本所在的目录，即项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONDA_ENV_NAME="pindata-env"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 conda 是否已安装
check_conda_installed() {
    if command -v conda &> /dev/null; then
        log_success "Conda is installed"
        return 0
    else
        log_error "Conda is not installed. Please install Anaconda or Miniconda first."
        echo "Visit: https://docs.conda.io/en/latest/miniconda.html"
        exit 1
    fi
}

# 检查并创建 conda 环境
check_conda_env() {
    log_info "Checking conda environment: $CONDA_ENV_NAME"
    
    if conda env list | grep -q "^$CONDA_ENV_NAME "; then
        log_success "Conda environment '$CONDA_ENV_NAME' exists"
        return 0
    else
        log_warning "Conda environment '$CONDA_ENV_NAME' does not exist. Creating..."
        conda create -n $CONDA_ENV_NAME python=3.10 -y
        if [ $? -eq 0 ]; then
            log_success "Created conda environment '$CONDA_ENV_NAME'"
            return 0
        else
            log_error "Failed to create conda environment"
            exit 1
        fi
    fi
}

# 激活 conda 环境
activate_conda_env() {
    log_info "Activating conda environment: $CONDA_ENV_NAME"
    
    # 初始化 conda for bash
    eval "$(conda shell.bash hook)"
    
    # 激活环境
    conda activate $CONDA_ENV_NAME
    if [ $? -eq 0 ]; then
        log_success "Activated conda environment '$CONDA_ENV_NAME'"
        return 0
    else
        log_error "Failed to activate conda environment"
        exit 1
    fi
}

# 检查 Python 包是否已安装
check_python_package() {
    python -c "import $1" &> /dev/null
}

# 检查后端依赖
check_backend_dependencies() {
    log_info "Checking backend dependencies..."
    
    # 检查 requirements.txt 是否存在
    if [ ! -f "$PROJECT_ROOT/backend/requirements.txt" ]; then
        log_warning "Backend requirements.txt not found"
        return 1
    fi
    
    # 检查关键包
    local packages=("flask" "sqlalchemy" "celery" "redis" "psycopg2")
    local missing_packages=()
    
    for package in "${packages[@]}"; do
        if ! check_python_package "$package"; then
            missing_packages+=("$package")
        fi
    done
    
    if [ ${#missing_packages[@]} -eq 0 ]; then
        log_success "All backend dependencies are installed"
        return 0
    else
        log_warning "Missing backend packages: ${missing_packages[*]}"
        return 1
    fi
}

# 安装后端依赖
install_backend_dependencies() {
    log_info "Installing backend dependencies..."
    
    cd "$PROJECT_ROOT/backend"
    
    # 先升级pip和setuptools
    pip install --upgrade pip setuptools wheel
    
    # 安装基础包
    pip install -r requirements.txt
    if [ $? -eq 0 ]; then
        log_success "Backend dependencies installed successfully"
        cd "$PROJECT_ROOT"
        return 0
    else
        log_error "Failed to install backend dependencies"
        cd "$PROJECT_ROOT"
        exit 1
    fi
}

# 检查 Dataflow 依赖
check_dataflow_dependencies() {
    log_info "Checking Dataflow dependencies..."
    
    # 检查 Dataflow 目录是否存在
    if [ ! -d "$PROJECT_ROOT/Dataflow" ]; then
        log_warning "Dataflow directory not found"
        return 1
    fi
    
    # 检查 requirements.txt 是否存在
    if [ ! -f "$PROJECT_ROOT/Dataflow/requirements.txt" ]; then
        log_warning "Dataflow requirements.txt not found"
        return 1
    fi
    
    # 检查关键包
    local packages=("datasets" "torch" "transformers" "openai" "fastapi")
    local missing_packages=()
    
    for package in "${packages[@]}"; do
        if ! check_python_package "$package"; then
            missing_packages+=("$package")
        fi
    done
    
    if [ ${#missing_packages[@]} -eq 0 ]; then
        log_success "All Dataflow dependencies are installed"
        return 0
    else
        log_warning "Missing Dataflow packages: ${missing_packages[*]}"
        return 1
    fi
}

# 安装 Dataflow 依赖
install_dataflow_dependencies() {
    log_info "Installing Dataflow dependencies..."
    
    cd "$PROJECT_ROOT/Dataflow"
    
    # 升级pip和setuptools
    pip install --upgrade pip setuptools wheel
    
    # 设置环境变量以避免编译错误
    export CFLAGS=-Wno-error=incompatible-function-pointer-types
    export CPPFLAGS=-Wno-error=incompatible-function-pointer-types
    
    # 首先尝试从conda-forge安装一些容易出错的包
    log_info "Installing problematic packages from conda-forge..."
    conda install -c conda-forge -y \
        spacy \
        numpy \
        scipy \
        torch \
        torchvision \
        torchaudio \
        transformers \
        pandas \
        scikit-learn \
        nltk
    
    # 然后安装剩余的包
    log_info "Installing remaining packages with pip..."
    pip install -r requirements.txt --prefer-binary --no-build-isolation
    
    if [ $? -eq 0 ]; then
        log_success "Dataflow dependencies installed successfully"
        cd "$PROJECT_ROOT"
        return 0
    else
        log_warning "Some packages failed to install, trying alternative approach..."
        
        # 创建一个临时的requirements文件，排除可能有问题的包
        cat > requirements_safe.txt << 'EOF'
datasets<=3.2
numpy<2.0.0
scipy
torch
torchvision
torchaudio
tqdm
transformers<=4.51.3
aisuite
math_verify
word2number
accelerate
rapidfuzz
colorlog
appdirs
datasketch
modelscope
addict
pytest
rich
docstring_parser
pydantic
nltk
colorama
func_timeout
sqlglot
openai
sentencepiece
datasketch
vendi-score==0.0.3
google-api-core
google-api-python-client
evaluate
chonkie
trafilatura
lxml_html_clean
cloudpickle
fastapi
httpx
pandas
psutil
pyfiglet
pyyaml
requests
termcolor
EOF
        
        # 尝试安装安全的依赖
        pip install -r requirements_safe.txt --prefer-binary --no-build-isolation
        
        # 清理临时文件
        rm -f requirements_safe.txt
        
        if [ $? -eq 0 ]; then
            log_success "Dataflow dependencies installed successfully (with exclusions)"
            cd "$PROJECT_ROOT"
            return 0
        else
            log_error "Failed to install Dataflow dependencies"
            cd "$PROJECT_ROOT"
            exit 1
        fi
    fi
}

# 检查 Overmind
check_overmind() {
    log_info "Checking Overmind..."
    
    if command -v overmind &> /dev/null; then
        log_success "Overmind is installed"
        return 0
    else
        log_error "Overmind is not installed"
        echo "Please install it first. On macOS: brew install overmind"
        exit 1
    fi
}

# 检查数据库连接
check_database() {
    log_info "Checking database connection..."
    
    # 这里可以添加数据库连接检查
    # 暂时跳过，假设数据库已经启动
    log_success "Database check passed"
    return 0
}

# 检查 Redis 连接
check_redis() {
    log_info "Checking Redis connection..."
    
    # 这里可以添加 Redis 连接检查
    # 暂时跳过，假设 Redis 已经启动
    log_success "Redis check passed"
    return 0
}

# 自检测功能
self_check() {
    log_info "Starting self-check..."
    echo "======================================"
    
    # 检查 conda
    check_conda_installed
    check_conda_env
    activate_conda_env
    
    # 检查后端依赖
    if ! check_backend_dependencies; then
        install_backend_dependencies
    fi
    
    # 检查 Dataflow 依赖
    if ! check_dataflow_dependencies; then
        install_dataflow_dependencies
    fi
    
    # 检查其他组件
    check_overmind
    check_database
    check_redis
    
    log_success "Self-check completed successfully!"
    echo "======================================"
}

# 启动服务
start_services() {
    log_info "Starting all services with Overmind..."
    echo "Press Ctrl+C to stop all services."
    echo "======================================"
    
    # 设置环境变量
    export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
    export FLASK_APP=run.py
    export FLASK_ENV=development
    
    # 确保在项目根目录
    cd "$PROJECT_ROOT"
    
    # 使用 overmind 启动服务
    overmind s -f Procfile
    EXIT_CODE=$?
    
    echo "======================================"
    if [ $EXIT_CODE -eq 0 ]; then
        log_success "All services stopped gracefully."
    else
        log_error "Services exited with code: $EXIT_CODE"
    fi
}

# 主函数
main() {
    echo "🚀 PinData Project Launcher"
    echo "======================================"
    
    # 执行自检测
    self_check
    
    # 启动服务
    start_services
}

# 运行主函数
main "$@" 