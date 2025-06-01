-- 创建文件库表
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建数据类型枚举
CREATE TYPE data_type_enum AS ENUM ('training', 'evaluation', 'mixed');
CREATE TYPE process_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed');

-- 创建文件库表
CREATE TABLE libraries (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    data_type data_type_enum NOT NULL DEFAULT 'training',
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- 统计字段
    file_count INTEGER DEFAULT 0,
    total_size BIGINT DEFAULT 0,
    processed_count INTEGER DEFAULT 0,
    processing_count INTEGER DEFAULT 0,
    pending_count INTEGER DEFAULT 0,
    md_count INTEGER DEFAULT 0,
    
    -- 时间字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建文件库文件表
CREATE TABLE library_files (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT,
    
    -- 存储相关
    minio_object_name VARCHAR(500) NOT NULL,
    minio_bucket VARCHAR(100) DEFAULT 'raw-data',
    
    -- 转换相关
    process_status process_status_enum DEFAULT 'pending',
    converted_format VARCHAR(50),
    converted_object_name VARCHAR(500),
    conversion_error TEXT,
    
    -- 元数据
    page_count INTEGER,
    word_count INTEGER,
    language VARCHAR(10),
    
    -- 关系
    library_id VARCHAR(36) NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
    
    -- 时间字段
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_libraries_name ON libraries(name);
CREATE INDEX idx_libraries_data_type ON libraries(data_type);
CREATE INDEX idx_libraries_created_at ON libraries(created_at);
CREATE INDEX idx_libraries_tags ON libraries USING GIN(tags);

CREATE INDEX idx_library_files_library_id ON library_files(library_id);
CREATE INDEX idx_library_files_filename ON library_files(filename);
CREATE INDEX idx_library_files_file_type ON library_files(file_type);
CREATE INDEX idx_library_files_process_status ON library_files(process_status);
CREATE INDEX idx_library_files_uploaded_at ON library_files(uploaded_at);

-- 创建更新时间自动触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_libraries_updated_at BEFORE UPDATE ON libraries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_library_files_updated_at BEFORE UPDATE ON library_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 