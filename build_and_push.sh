#!/bin/bash

# if [ "$(id -u)" -eq 0 ]; then
#   echo "❌ 请不要使用 sudo 或以 root 用户身份运行此脚本。"
#   echo "   Docker 登录凭证与您的普通用户绑定。"
#   echo "   请直接运行 ./build_and_push.sh"
#   exit 1
# fi

# 配置变量 - 请修改为你的Docker Hub用户名
# win下 需要先 dos2unix build_and_push.sh
DOCKERHUB_USERNAME="rqlove"
BACKEND_IMAGE_NAME="pindata-api"
FRONTEND_IMAGE_NAME="pindata-frontend"
VERSION="v0.0.6.4"  # 你可以修改版本号

echo "=== 开始构建和推送Docker镜像 ==="
echo "Docker Hub用户名: $DOCKERHUB_USERNAME"
echo "版本号: $VERSION"
echo ""

# 检查是否已登录Docker Hub (简化检查)
echo "跳过登录检查，直接开始构建..."
echo "如果推送失败，请确保已登录: docker login"

echo "=== 构建后端镜像 ==="
echo "正在构建后端镜像..."
docker build -t $DOCKERHUB_USERNAME/$BACKEND_IMAGE_NAME:$VERSION ./backend
docker build -t $DOCKERHUB_USERNAME/$BACKEND_IMAGE_NAME:latest ./backend

if [ $? -eq 0 ]; then
    echo "✅ 后端镜像构建成功"
else
    echo "❌ 后端镜像构建失败"
    exit 1
fi

echo ""
echo "=== 构建前端镜像 ==="
echo "正在构建前端镜像..."
docker build -t $DOCKERHUB_USERNAME/$FRONTEND_IMAGE_NAME:$VERSION ./frontend
docker build -t $DOCKERHUB_USERNAME/$FRONTEND_IMAGE_NAME:latest ./frontend

if [ $? -eq 0 ]; then
    echo "✅ 前端镜像构建成功"
else
    echo "❌ 前端镜像构建失败"
    exit 1
fi

echo ""
echo "=== 推送后端镜像到Docker Hub ==="
echo "正在推送后端镜像..."
docker push $DOCKERHUB_USERNAME/$BACKEND_IMAGE_NAME:$VERSION
docker push $DOCKERHUB_USERNAME/$BACKEND_IMAGE_NAME:latest

if [ $? -eq 0 ]; then
    echo "✅ 后端镜像推送成功"
else
    echo "❌ 后端镜像推送失败"
    exit 1
fi

echo ""
echo "=== 推送前端镜像到Docker Hub ==="
echo "正在推送前端镜像..."
docker push $DOCKERHUB_USERNAME/$FRONTEND_IMAGE_NAME:$VERSION
docker push $DOCKERHUB_USERNAME/$FRONTEND_IMAGE_NAME:latest

if [ $? -eq 0 ]; then
    echo "✅ 前端镜像推送成功"
else
    echo "❌ 前端镜像推送失败"
    exit 1
fi

echo ""
echo "=== 完成！==="
echo "镜像已成功推送到Docker Hub:"
echo "- 后端镜像: $DOCKERHUB_USERNAME/$BACKEND_IMAGE_NAME:$VERSION"
echo "- 前端镜像: $DOCKERHUB_USERNAME/$FRONTEND_IMAGE_NAME:$VERSION"
echo ""
echo "你现在可以在docker-compose.yml中更新镜像名称："
echo "- image: $DOCKERHUB_USERNAME/$BACKEND_IMAGE_NAME:$VERSION"
echo "- image: $DOCKERHUB_USERNAME/$FRONTEND_IMAGE_NAME:$VERSION" 