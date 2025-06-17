FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖，包括 tesseract、OpenCV 基础依赖和其他必要工具
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    tesseract-ocr \
    tesseract-ocr-chi-sim \
    tesseract-ocr-chi-tra \
    poppler-utils \
    libpq-dev \
    build-essential \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 升级 pip 并安装Python依赖
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 设置环境变量
ENV FLASK_APP=run.py
ENV FLASK_ENV=development
ENV OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
ENV PYTHONPATH=/app

# 给脚本执行权限（在复制文件后设置）
RUN chmod +x start_celery_threads.sh start_celery.sh

# 暴露端口
EXPOSE 8897

# 默认启动命令（将被 docker-compose 覆盖）
CMD ["python", "run.py"] 