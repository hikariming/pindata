#!/bin/bash

# 依赖安装脚本 - 专门解决Python 3.13兼容性问题
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

# 检查并重新创建conda环境
recreate_conda_env() {
    log_info "Recreating conda environment with Python 3.10..."
    
    # 删除现有环境
    if conda env list | grep -q "^$CONDA_ENV_NAME "; then
        log_warning "Removing existing environment..."
        conda env remove -n $CONDA_ENV_NAME -y
    fi
    
    # 创建新环境，确保使用Python 3.10
    log_info "Creating new environment with Python 3.10..."
    conda create -n $CONDA_ENV_NAME python=3.10 -y
    
    if [ $? -eq 0 ]; then
        log_success "Created conda environment '$CONDA_ENV_NAME' with Python 3.10"
        return 0
    else
        log_error "Failed to create conda environment"
        exit 1
    fi
}

# 激活conda环境
activate_conda_env() {
    log_info "Activating conda environment: $CONDA_ENV_NAME"
    
    # 初始化conda for bash
    eval "$(conda shell.bash hook)"
    
    # 激活环境
    conda activate $CONDA_ENV_NAME
    if [ $? -eq 0 ]; then
        log_success "Activated conda environment '$CONDA_ENV_NAME'"
        # 检查Python版本
        python_version=$(python --version 2>&1)
        log_info "Using Python version: $python_version"
        return 0
    else
        log_error "Failed to activate conda environment"
        exit 1
    fi
}

# 安装系统依赖
install_system_dependencies() {
    log_info "Installing system dependencies..."
    
    # 检查操作系统
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            log_info "Installing macOS dependencies with Homebrew..."
            brew install cmake pkgconfig rust
        else
            log_warning "Homebrew not found. Please install Homebrew first."
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            log_info "Installing Linux dependencies with apt..."
            sudo apt-get update
            sudo apt-get install -y build-essential cmake pkg-config libssl-dev
        elif command -v yum &> /dev/null; then
            log_info "Installing Linux dependencies with yum..."
            sudo yum install -y gcc gcc-c++ cmake pkgconfig openssl-devel
        fi
    fi
}

# 创建优化的requirements文件
create_optimized_requirements() {
    log_info "Creating optimized requirements files..."
    
    # 创建后端优化requirements
    cat > "$PROJECT_ROOT/backend/requirements_optimized.txt" << 'EOF'
# Flask核心
Flask==3.0.0
Flask-RESTful==0.3.10
Flask-CORS==4.0.0
Flask-JWT-Extended==4.5.3

# 数据库相关
SQLAlchemy==2.0.31
psycopg2-binary==2.9.10
alembic==1.13.0
redis==5.0.1
flask_sqlalchemy

# API文档
flasgger==0.9.7.1

# 数据处理
pandas>=1.5.0
numpy>=1.24.0,<2.0.0

# 对象存储
minio==7.2.0

# 任务队列
celery==5.3.4
kombu==5.3.4

# 工具库
python-dotenv==1.0.0
marshmallow==3.19.0
marshmallow-sqlalchemy==0.29.0
python-multipart==0.0.6

# 文档解析
python-docx==1.1.0
python-pptx==0.6.23
PyPDF2==3.0.1

# 开发工具
pytest==7.4.3
pytest-cov==4.1.0
black==23.12.0
flake8==6.1.0

# Markdown
markitdown

# LLM集成
langchain
langchain-openai
langchain-google-genai
langchain-anthropic
langchain-community
pillow>=9.0.0
pdf2image
pytesseract
google-generativeai
anthropic>=0.8.0
openai>=1.0.0

# 数据集导入
huggingface_hub>=0.19.0
modelscope>=1.9.0

# 图像处理
opencv-python-headless>=4.8.0
scikit-image>=0.21.0
EOF

    # 创建Dataflow优化requirements
    cat > "$PROJECT_ROOT/Dataflow/requirements_optimized.txt" << 'EOF'
# 基础包
datasets<=3.2
numpy<2.0.0
scipy
tqdm
colorlog
appdirs
addict
pytest
rich
docstring_parser
pydantic
nltk
colorama
rapidfuzz

# AI/ML包
torch>=1.9.0
torchvision
torchaudio
transformers<=4.51.3
accelerate
sentencepiece
evaluate

# 文本处理
func_timeout
sqlglot
kenlm
langkit
math_verify
word2number

# APIs
openai
google-api-core
google-api-python-client
fastapi
httpx
requests

# 数据处理
pandas
datasketch
cloudpickle
pyyaml
psutil

# 可视化
termcolor
pyfiglet

# 知识库清理
chonkie
trafilatura
lxml_html_clean

# 模型
modelscope
aisuite
vendi-score==0.0.3
EOF

    log_success "Optimized requirements files created"
}

# 安装conda基础包
install_conda_base_packages() {
    log_info "Installing base packages from conda-forge..."
    
    # 安装基础数值计算包
    conda install -c conda-forge -y \
        numpy \
        scipy \
        pandas \
        scikit-learn \
        nltk \
        pip \
        setuptools \
        wheel \
        cmake \
        pkg-config
    
    # 安装PyTorch
    log_info "Installing PyTorch..."
    conda install -c pytorch -c conda-forge -y \
        pytorch \
        torchvision \
        torchaudio \
        cpuonly
    
    # 安装transformers和相关包
    log_info "Installing transformers and related packages..."
    conda install -c conda-forge -y \
        transformers \
        tokenizers \
        datasets \
        accelerate
    
    if [ $? -eq 0 ]; then
        log_success "Base packages installed successfully"
        return 0
    else
        log_error "Failed to install base packages"
        return 1
    fi
}

# 安装后端依赖
install_backend_dependencies() {
    log_info "Installing backend dependencies..."
    
    cd "$PROJECT_ROOT/backend"
    
    # 升级pip工具
    pip install --upgrade pip setuptools wheel
    
    # 使用优化的requirements文件
    if [ -f "requirements_optimized.txt" ]; then
        pip install -r requirements_optimized.txt --prefer-binary --no-build-isolation
    else
        pip install -r requirements.txt --prefer-binary --no-build-isolation
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Backend dependencies installed successfully"
        cd "$PROJECT_ROOT"
        return 0
    else
        log_error "Failed to install backend dependencies"
        cd "$PROJECT_ROOT"
        return 1
    fi
}

# 安装Dataflow依赖
install_dataflow_dependencies() {
    log_info "Installing Dataflow dependencies..."
    
    cd "$PROJECT_ROOT/Dataflow"
    
    # 设置编译环境变量
    export CFLAGS=-Wno-error=incompatible-function-pointer-types
    export CPPFLAGS=-Wno-error=incompatible-function-pointer-types
    export LDFLAGS=-Wno-error=incompatible-function-pointer-types
    
    # 升级pip工具
    pip install --upgrade pip setuptools wheel
    
    # 使用优化的requirements文件
    if [ -f "requirements_optimized.txt" ]; then
        pip install -r requirements_optimized.txt --prefer-binary --no-build-isolation
    else
        pip install -r requirements.txt --prefer-binary --no-build-isolation
    fi
    
    if [ $? -eq 0 ]; then
        log_success "Dataflow dependencies installed successfully"
        cd "$PROJECT_ROOT"
        return 0
    else
        log_warning "Some packages failed, trying manual installation..."
        
        # 手动安装容易出错的包
        log_info "Installing problematic packages individually..."
        
        # 安装fasttext的替代品
        pip install fasttext-wheel --prefer-binary --no-build-isolation
        
        # 安装presidio相关包
        pip install presidio-analyzer --prefer-binary --no-build-isolation
        pip install presidio-anonymizer --prefer-binary --no-build-isolation
        
        cd "$PROJECT_ROOT"
        return 0
    fi
}

# 验证安装
verify_installation() {
    log_info "Verifying installation..."
    
    # 检查关键包
    python -c "import flask; print('Flask:', flask.__version__)" 2>/dev/null || log_warning "Flask not installed"
    python -c "import torch; print('PyTorch:', torch.__version__)" 2>/dev/null || log_warning "PyTorch not installed"
    python -c "import transformers; print('Transformers:', transformers.__version__)" 2>/dev/null || log_warning "Transformers not installed"
    python -c "import pandas; print('Pandas:', pandas.__version__)" 2>/dev/null || log_warning "Pandas not installed"
    python -c "import numpy; print('NumPy:', numpy.__version__)" 2>/dev/null || log_warning "NumPy not installed"
    
    log_success "Installation verification completed"
}

# 主函数
main() {
    echo "🔧 PinData Dependencies Installer"
    echo "======================================"
    
    # 检查conda是否安装
    if ! command -v conda &> /dev/null; then
        log_error "Conda is not installed. Please install Anaconda or Miniconda first."
        exit 1
    fi
    
    # 重新创建环境
    recreate_conda_env
    
    # 激活环境
    activate_conda_env
    
    # 安装系统依赖
    install_system_dependencies
    
    # 创建优化的requirements文件
    create_optimized_requirements
    
    # 安装基础包
    install_conda_base_packages
    
    # 安装后端依赖
    install_backend_dependencies
    
    # 安装Dataflow依赖
    install_dataflow_dependencies
    
    # 验证安装
    verify_installation
    
    echo "======================================"
    log_success "Dependencies installation completed!"
    log_info "You can now run: ./start.sh"
}

# 运行主函数
main "$@" 