-- 重置 DataFlow 相关表和枚举的 SQL 脚本
-- 请在执行前备份数据库！

-- 1. 删除相关表（如果存在）
DROP TABLE IF EXISTS dataflow_results CASCADE;
DROP TABLE IF EXISTS dataflow_quality_metrics CASCADE;

-- 2. 删除并重新创建 tasktype 枚举
DROP TYPE IF EXISTS tasktype CASCADE;
CREATE TYPE tasktype AS ENUM (
    'PIPELINE_EXECUTION',
    'DATA_IMPORT', 
    'DATA_EXPORT',
    'DATA_PROCESSING',
    'DOCUMENT_CONVERSION',
    'DATASET_GENERATION',
    'PRETRAIN_FILTER',
    'PRETRAIN_SYNTHETIC',
    'SFT_FILTER',
    'SFT_SYNTHETIC'
);

-- 3. 创建 pipelinetype 枚举
DROP TYPE IF EXISTS pipelinetype CASCADE;
CREATE TYPE pipelinetype AS ENUM (
    'PRETRAIN_FILTER',
    'PRETRAIN_SYNTHETIC', 
    'SFT_FILTER',
    'SFT_SYNTHETIC'
);

-- 4. 创建 dataflow_results 表
CREATE TABLE dataflow_results (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    original_file_id VARCHAR(36),
    library_file_id VARCHAR(36),
    original_content TEXT,
    processed_content TEXT,
    quality_score FLOAT,
    processing_time FLOAT,
    output_format VARCHAR(50),
    minio_bucket VARCHAR(255),
    minio_object_name VARCHAR(255),
    file_size BIGINT,
    status VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 5. 创建 dataflow_quality_metrics 表
CREATE TABLE dataflow_quality_metrics (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) NOT NULL,
    pipeline_type pipelinetype NOT NULL,
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    success_rate FLOAT DEFAULT 0.0,
    average_quality_score FLOAT DEFAULT 0.0,
    total_processing_time FLOAT DEFAULT 0.0,
    average_processing_time FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- 6. 创建索引
CREATE INDEX idx_dataflow_results_task_id ON dataflow_results(task_id);
CREATE INDEX idx_dataflow_results_library_file_id ON dataflow_results(library_file_id);
CREATE INDEX idx_dataflow_results_status ON dataflow_results(status);
CREATE INDEX idx_dataflow_quality_metrics_task_id ON dataflow_quality_metrics(task_id);
CREATE INDEX idx_dataflow_quality_metrics_pipeline_type ON dataflow_quality_metrics(pipeline_type);

-- 7. 如果 tasks 表的 type 字段引用了旧的 tasktype，需要重新创建
-- 注意：这会删除现有的 tasks 数据！
-- 如果你想保留现有任务数据，请先导出，然后在重新创建表后导入

-- 检查 tasks 表结构
-- SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'type';

-- 如果需要重新创建 tasks 表（可选，根据实际情况决定）
/*
DROP TABLE IF EXISTS tasks CASCADE;
CREATE TABLE tasks (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type tasktype NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    library_id VARCHAR(36),
    file_ids JSON,
    created_by VARCHAR(100),
    config JSON,
    result JSON,
    results JSON,
    quality_metrics JSON,
    current_file VARCHAR(255),
    error_message TEXT,
    total_files INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    failed_files INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    celery_task_id VARCHAR(255),
    FOREIGN KEY (library_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE INDEX idx_tasks_library_id ON tasks(library_id);
CREATE INDEX idx_tasks_type ON tasks(type);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
*/

-- 完成提示
SELECT 'DataFlow 表重置完成！' as message; 