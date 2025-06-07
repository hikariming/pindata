#!/bin/bash

# PinData Docker 构建脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
API_IMAGE_NAME="hikariming/pindata-api"
FRONTEND_IMAGE_NAME="hikariming/pindata-frontend"
VERSION="v0.01"
API_FULL_IMAGE_NAME="${API_IMAGE_NAME}:${VERSION}"
FRONTEND_FULL_IMAGE_NAME="${FRONTEND_IMAGE_NAME}:${VERSION}"

echo -e "${BLUE}"
echo "=================================================="
echo "  🔨 PinData Docker 镜像构建脚本"
echo "=================================================="
echo -e "${NC}"

# 询问构建选项
echo -e "${YELLOW}请选择构建选项:${NC}"
echo "1. 构建后端 API 镜像"
echo "2. 构建前端镜像"
echo "3. 构建所有镜像"
read -p "请输入选项 (1-3): " build_choice

build_api=false
build_frontend=false

case $build_choice in
    1)
        build_api=true
        ;;
    2)
        build_frontend=true
        ;;
    3)
        build_api=true
        build_frontend=true
        ;;
    *)
        echo -e "${RED}无效选项，默认构建所有镜像${NC}"
        build_api=true
        build_frontend=true
        ;;
esac

# 构建后端 API 镜像
if [ "$build_api" = true ]; then
    echo -e "${GREEN}🔨 开始构建后端 API 镜像...${NC}"
    
    # 切换到后端目录
    cd ../backend
    
    echo -e "${YELLOW}正在构建镜像: ${API_FULL_IMAGE_NAME}${NC}"
    docker build -t ${API_FULL_IMAGE_NAME} .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 后端镜像构建成功: ${API_FULL_IMAGE_NAME}${NC}"
    else
        echo -e "${RED}❌ 后端镜像构建失败${NC}"
        exit 1
    fi
    
    cd ../docker
fi

# 构建前端镜像
if [ "$build_frontend" = true ]; then
    echo -e "${GREEN}🔨 开始构建前端镜像...${NC}"
    
    # 切换到前端目录
    cd ../frontend
    
    echo -e "${YELLOW}正在构建镜像: ${FRONTEND_FULL_IMAGE_NAME}${NC}"
    docker build -t ${FRONTEND_FULL_IMAGE_NAME} .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 前端镜像构建成功: ${FRONTEND_FULL_IMAGE_NAME}${NC}"
    else
        echo -e "${RED}❌ 前端镜像构建失败${NC}"
        exit 1
    fi
    
    cd ../docker
fi

# 询问是否推送到 Docker Hub
read -p "是否推送到 Docker Hub? (y/N): " push_choice
if [[ $push_choice =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}正在推送镜像到 Docker Hub...${NC}"
    
    if [ "$build_api" = true ]; then
        echo -e "${YELLOW}推送后端镜像...${NC}"
        docker push ${API_FULL_IMAGE_NAME}
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ 后端镜像推送成功${NC}"
        else
            echo -e "${RED}❌ 后端镜像推送失败${NC}"
            exit 1
        fi
    fi
    
    if [ "$build_frontend" = true ]; then
        echo -e "${YELLOW}推送前端镜像...${NC}"
        docker push ${FRONTEND_FULL_IMAGE_NAME}
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ 前端镜像推送成功${NC}"
        else
            echo -e "${RED}❌ 前端镜像推送失败${NC}"
            exit 1
        fi
    fi
fi

echo -e "${BLUE}"
echo "=================================================="
echo "  🎉 构建完成！"
echo "=================================================="
echo -e "${NC}"

if [ "$build_api" = true ]; then
    echo -e "后端镜像: ${API_FULL_IMAGE_NAME}"
fi

if [ "$build_frontend" = true ]; then
    echo -e "前端镜像: ${FRONTEND_FULL_IMAGE_NAME}"
fi

echo -e "${GREEN}使用以下命令启动服务:${NC}"
echo -e "  cd docker && docker-compose up -d" 