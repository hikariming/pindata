-- 添加datasets表缺失的字段
-- 执行此脚本修复数据库结构

-- 添加数据集类型字段
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS dataset_type VARCHAR(50);

-- 添加数据集格式字段
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS dataset_format VARCHAR(50);

-- 添加状态字段
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';

-- 添加生成进度字段
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS generation_progress INTEGER DEFAULT 0;

-- 添加文件路径字段
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS file_path VARCHAR(500);

-- 添加文件大小字段（字节）
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- 添加记录数量字段
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS record_count INTEGER;

-- 添加错误信息字段
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 添加元数据字段（重命名为meta_data避免冲突）
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS meta_data JSONB;

-- 添加完成时间字段
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- 如果存在metadata字段，将其重命名为meta_data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'datasets' AND column_name = 'metadata') THEN
        ALTER TABLE datasets RENAME COLUMN metadata TO meta_data;
    END IF;
END
$$;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_datasets_dataset_type ON datasets(dataset_type);
CREATE INDEX IF NOT EXISTS idx_datasets_status ON datasets(status);
CREATE INDEX IF NOT EXISTS idx_datasets_completed_at ON datasets(completed_at);

-- 显示更新后的表结构
\d datasets; 