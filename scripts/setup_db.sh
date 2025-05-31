#!/bin/bash

# scripts/setup_db.sh
# 这个脚本用于初始化或重置开发数据库
# 警告：此脚本可能会删除现有数据，请谨慎使用

# 加载 .env 文件中的环境变量 (如果存在)
if [ -f ../.env ]; then
    export $(grep -v '^#' ../.env | xargs)
fi

# 数据库连接参数 (优先使用环境变量，否则使用默认值)
DB_HOST=${POSTGRES_HOST:-localhost}
DB_PORT=${POSTGRES_PORT:-5432}
DB_USER=${POSTGRES_USER:-postgres} # 通常是 postgres 的超级用户
DB_PASSWORD=${POSTGRES_PASSWORD:-password}
DB_NAME=${POSTGRES_DB:-llama_dataset_db} # 应用要连接的数据库名
APP_DB_USER=${APP_DB_USER:-app_user} # 应用专用的数据库用户
APP_DB_PASSWORD=${APP_DB_PASSWORD:-app_password} # 应用专用用户的密码

# PGPASSWORD 用于 psql 非交互式登录
export PGPASSWORD=$DB_PASSWORD

# 函数：执行 psql 命令
run_psql_command() {
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "$1"
}

run_psql_command_on_app_db() {
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "$1"
}

echo "Starting database setup..."

# 1. 检查 PostgreSQL 服务是否可达 (可选，但推荐)
# pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER
# if [ $? -ne 0 ]; then
#     echo "PostgreSQL server is not accessible. Please check connection parameters or if the server is running."
#     exit 1
# fi

# 2. 删除现有的应用数据库 (如果需要完全重置)
read -p "Do you want to DROP the existing database '$DB_NAME' (if it exists)? (y/N): " confirm_drop_db
if [[ "$confirm_drop_db" == "y" || "$confirm_drop_db" == "Y" ]]; then
    echo "Dropping database $DB_NAME..."
    run_psql_command "DROP DATABASE IF EXISTS $DB_NAME;"
fi

# 3. 创建应用数据库 (如果不存在)
echo "Creating database $DB_NAME (if it does not exist)..."
run_psql_command "CREATE DATABASE $DB_NAME OWNER $DB_USER;" \
    || echo "Database $DB_NAME might already exist or creation failed."

# 4. 创建应用专用的数据库用户 (如果不存在)
# echo "Creating application user $APP_DB_USER (if it does not exist)..."
# run_psql_command "CREATE USER $APP_DB_USER WITH PASSWORD '$APP_DB_PASSWORD';" \
#     || echo "User $APP_DB_USER might already exist or creation failed."

# 5. 授予应用用户在应用数据库上的权限
# echo "Granting privileges to $APP_DB_USER on database $DB_NAME..."
# run_psql_command "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $APP_DB_USER;"
# 如果使用了 schema，还需要授权 schema usage 和 table DML
# run_psql_command_on_app_db "GRANT USAGE ON SCHEMA public TO $APP_DB_USER;"
# run_psql_command_on_app_db "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $APP_DB_USER;"
# run_psql_command_on_app_db "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $APP_DB_USER;"


# 6. 运行数据库迁移 (如果使用 Alembic 或 Flask-Migrate)
# cd ../backend # 切换到 backend 目录
# source venv/bin/activate # 激活虚拟环境 (如果需要)
# echo "Running database migrations..."
# alembic upgrade head # 或者: flask db upgrade
# cd ../scripts # 切回 scripts 目录

echo "Database setup script finished."

# 清理 PGPASSWORD
unset PGPASSWORD 