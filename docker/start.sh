#!/bin/bash

# PinData 快速启动脚本

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "=================================================="
echo "  🚀 PinData Docker 快速启动脚本"
echo "=================================================="
echo -e "${NC}"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 未安装，请先安装 Docker Compose${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker 环境检查通过${NC}"

# 创建必要的目录
mkdir -p postgres redis

# 停止现有服务（如果存在）
echo -e "${YELLOW}🛑 停止现有服务...${NC}"
docker compose down 2>/dev/null || true

# 拉取最新镜像
echo -e "${YELLOW}📥 拉取基础镜像...${NC}"
docker compose pull db redis minio

# 构建 PinData 镜像
echo -e "${YELLOW}🔨 构建 PinData 镜像...${NC}"
docker compose build pindata-api pindata-frontend

# 启动所有服务
echo -e "${YELLOW}🚀 启动所有服务...${NC}"
docker compose up -d

# 等待服务启动
echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 10

# 检查服务状态
echo -e "${GREEN}📊 检查服务状态:${NC}"
docker compose ps

# 显示访问信息
echo -e "${BLUE}"
echo "=================================================="
echo "  🎉 PinData 服务启动完成！"
echo "=================================================="
echo -e "${NC}"

echo -e "${GREEN}📱 服务访问地址:${NC}"
echo "  • PinData 前端:    http://localhost:3000"
echo "  • PinData API:     http://localhost:8897"
echo "  • MinIO 控制台:    http://localhost:9001"
echo "  • PostgreSQL:      localhost:5432"
echo "  • Redis:           localhost:6379"

echo -e "${GREEN}🔑 默认凭据:${NC}"
echo "  • MinIO 用户名:    minioadmin"
echo "  • MinIO 密码:      minioadmin"
echo "  • PostgreSQL 用户: postgres"
echo "  • PostgreSQL 密码: password"

echo -e "${YELLOW}💡 常用命令:${NC}"
echo "  • 查看日志:        docker compose logs -f"
echo "  • 停止服务:        docker compose down"
echo "  • 重启服务:        docker compose restart"

echo -e "${GREEN}✨ 部署完成！请检查上述服务是否正常运行。${NC}" 