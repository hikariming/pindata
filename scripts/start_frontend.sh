#!/bin/bash

# scripts/start_frontend.sh
# 启动前端开发服务器的脚本

# 获取脚本所在的目录
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PROJECT_ROOT=$( cd -- "$SCRIPT_DIR/.." &> /dev/null && pwd )
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "Project root: $PROJECT_ROOT"
echo "Frontend directory: $FRONTEND_DIR"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "Frontend directory $FRONTEND_DIR does not exist. Cannot start frontend."
    exit 1
fi

cd "$FRONTEND_DIR"

# 检查 package.json 是否存在
if [ ! -f "package.json" ]; then
    echo "package.json not found in $FRONTEND_DIR."
    echo "Is this a valid Node.js/React project?"
    exit 1
fi

# 检查 node_modules 是否存在，提示用户 npm install
if [ ! -d "node_modules" ]; then
    echo "'node_modules' directory not found."
    echo "Please run 'npm install' or 'yarn install' in $FRONTEND_DIR first."
    # read -p "Do you want to run 'npm install' now? (y/N): " confirm_install
    # if [[ "$confirm_install" == "y" || "$confirm_install" == "Y" ]]; then
    #     npm install
    #     if [ $? -ne 0 ]; then
    #         echo "npm install failed. Please check for errors."
    #         exit 1
    #     fi
    # else
    #     exit 1
    # fi
    echo "Exiting. Please run npm install manually."
    exit 1
fi


echo "Starting frontend development server (npm start)..."
# 通常 React 项目使用 npm start
npm start

# 当服务器停止后 (例如 Ctrl+C)
echo "Frontend server stopped." 