-- infra/postgres/init.sql
-- 这个脚本会在 PostgreSQL 容器第一次启动时自动执行
-- 用于创建数据库、用户、模式或初始表结构 (如果不由迁移工具管理)

-- 检查并创建数据库 (如果 docker-compose 中没有通过 POSTGRES_DB 指定)
-- SELECT 'CREATE DATABASE llmadataset_infra_db'
-- WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'llmadataset_infra_db')\gexec

-- 创建额外的用户或角色 (如果需要)
-- CREATE USER my_infra_user WITH PASSWORD 'my_password';
-- GRANT ALL PRIVILEGES ON DATABASE llmadataset_infra_db TO my_infra_user;

-- 在特定数据库中执行命令 (连接到目标数据库后)
-- \c llmadataset_infra_db;

-- 创建模式 (如果应用需要)
-- CREATE SCHEMA IF NOT EXISTS infra_schema;

-- 创建初始表 (如果这些表不通过 Alembic 等迁移工具管理)
/*
CREATE TABLE IF NOT EXISTS infra_schema.example_table (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO infra_schema.example_table (name) VALUES ('Initial Infra Record');
*/

SELECT 'PostgreSQL infra init script completed.' AS status; 