-- 数据集相关表创建脚本
-- 执行前请确保数据库连接正常

-- 删除现有表（如果存在）
DROP TABLE IF EXISTS dataset_downloads CASCADE;
DROP TABLE IF EXISTS dataset_likes CASCADE;
DROP TABLE IF EXISTS dataset_tags CASCADE;
DROP TABLE IF EXISTS dataset_versions CASCADE;
DROP TABLE IF EXISTS datasets CASCADE;

-- 创建数据集主表
CREATE TABLE datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner VARCHAR(255) NOT NULL,
    description TEXT,
    size VARCHAR(50) DEFAULT '0B',
    downloads INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    license VARCHAR(100),
    task_type VARCHAR(100),
    language VARCHAR(50),
    featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建数据集版本表
CREATE TABLE dataset_versions (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    parent_version_id INTEGER REFERENCES dataset_versions(id) ON DELETE SET NULL,
    pipeline_config JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{}',
    file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建数据集标签表
CREATE TABLE dataset_tags (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL
);

-- 创建数据集点赞记录表
CREATE TABLE dataset_likes (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建数据集下载记录表
CREATE TABLE dataset_downloads (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    user_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX idx_datasets_owner ON datasets(owner);
CREATE INDEX idx_datasets_task_type ON datasets(task_type);
CREATE INDEX idx_datasets_language ON datasets(language);
CREATE INDEX idx_datasets_featured ON datasets(featured);
CREATE INDEX idx_datasets_created_at ON datasets(created_at);
CREATE INDEX idx_datasets_updated_at ON datasets(updated_at);
CREATE INDEX idx_datasets_downloads ON datasets(downloads);
CREATE INDEX idx_datasets_likes ON datasets(likes);

CREATE INDEX idx_dataset_versions_dataset_id ON dataset_versions(dataset_id);
CREATE INDEX idx_dataset_versions_version ON dataset_versions(version);
CREATE INDEX idx_dataset_versions_created_at ON dataset_versions(created_at);

CREATE INDEX idx_dataset_tags_dataset_id ON dataset_tags(dataset_id);
CREATE INDEX idx_dataset_tags_name ON dataset_tags(name);

CREATE INDEX idx_dataset_likes_dataset_id ON dataset_likes(dataset_id);
CREATE INDEX idx_dataset_likes_user_id ON dataset_likes(user_id);
CREATE INDEX idx_dataset_likes_created_at ON dataset_likes(created_at);

CREATE INDEX idx_dataset_downloads_dataset_id ON dataset_downloads(dataset_id);
CREATE INDEX idx_dataset_downloads_user_id ON dataset_downloads(user_id);
CREATE INDEX idx_dataset_downloads_created_at ON dataset_downloads(created_at);

-- 创建唯一约束
ALTER TABLE datasets ADD CONSTRAINT uk_datasets_owner_name UNIQUE (owner, name);
ALTER TABLE dataset_versions ADD CONSTRAINT uk_dataset_versions_dataset_version UNIQUE (dataset_id, version);
ALTER TABLE dataset_likes ADD CONSTRAINT uk_dataset_likes_dataset_user UNIQUE (dataset_id, user_id);

-- 创建触发器函数来自动更新updated_at字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为datasets表创建更新时间触发器
CREATE TRIGGER update_datasets_updated_at 
    BEFORE UPDATE ON datasets 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 插入示例数据
INSERT INTO datasets (name, owner, description, size, downloads, likes, license, task_type, language, featured) VALUES
('Mixture-of-Thoughts', 'open-r1', 'A comprehensive dataset for training mixture of expert models with diverse reasoning capabilities.', '699MB', 11300, 140, 'MIT', 'Natural Language Processing', 'English', true),
('SynLogic', 'MiniMaxAI', 'Synthetic logical reasoning dataset generated using advanced language models.', '49.3MB', 211, 51, 'Apache 2.0', 'Question Answering', 'English', false),
('china-refusals', 'cognitivecomputations', 'Dataset focused on AI safety and alignment research with Chinese language examples.', '10.1MB', 302, 25, 'CC BY 4.0', 'Text Classification', 'Chinese', false),
('MMLU-Pro', 'TIGER-Lab', 'An enhanced version of MMLU with more challenging questions and improved evaluation.', '125MB', 5680, 89, 'MIT', 'Question Answering', 'English', true),
('Chinese-WebText', 'CLUE-benchmark', 'Large-scale Chinese web text corpus for language model pre-training.', '2.3GB', 15420, 203, 'CC BY-SA 4.0', 'Natural Language Processing', 'Chinese', true),
('CodeSearchNet', 'github', 'A collection of datasets and benchmarks for semantic code search.', '850MB', 8900, 156, 'MIT', 'Code Generation', 'Multi-language', false),
('Common Crawl News', 'commoncrawl', 'News articles extracted from Common Crawl web crawl data.', '12GB', 23400, 312, 'CC0', 'Natural Language Processing', 'Multi-language', false),
('MS COCO Captions', 'microsoft', 'Image captioning dataset with human-annotated descriptions.', '1.2GB', 18700, 445, 'CC BY 4.0', 'Computer Vision', 'English', true);

-- 插入数据集版本数据
INSERT INTO dataset_versions (dataset_id, version, pipeline_config, stats, file_path) VALUES
(1, 'v1.0', '{"format": "jsonl", "encoding": "utf-8"}', '{"total_samples": 150000, "avg_length": 512}', 'datasets/open-r1/Mixture-of-Thoughts/data_v1.jsonl'),
(1, 'v1.1', '{"format": "jsonl", "encoding": "utf-8"}', '{"total_samples": 165000, "avg_length": 528}', 'datasets/open-r1/Mixture-of-Thoughts/data_v1.1.jsonl'),
(1, 'v2.0', '{"format": "jsonl", "encoding": "utf-8"}', '{"total_samples": 200000, "avg_length": 545}', 'datasets/open-r1/Mixture-of-Thoughts/data_v2.jsonl'),

(2, 'v1.0', '{"format": "json", "encoding": "utf-8"}', '{"total_samples": 50000, "avg_length": 256}', 'datasets/MiniMaxAI/SynLogic/data.json'),

(3, 'v1.0', '{"format": "jsonl", "encoding": "utf-8"}', '{"total_samples": 25000, "avg_length": 180}', 'datasets/cognitivecomputations/china-refusals/data.jsonl'),
(3, 'v1.1', '{"format": "jsonl", "encoding": "utf-8"}', '{"total_samples": 28000, "avg_length": 195}', 'datasets/cognitivecomputations/china-refusals/data_v1.1.jsonl'),

(4, 'v1.0', '{"format": "json", "encoding": "utf-8"}', '{"total_samples": 12000, "categories": 57}', 'datasets/TIGER-Lab/MMLU-Pro/data.json'),

(5, 'v1.0', '{"format": "txt", "encoding": "utf-8"}', '{"total_size_gb": 2.3, "documents": 4500000}', 'datasets/CLUE-benchmark/Chinese-WebText/corpus.txt'),

(6, 'v1.0', '{"format": "multiple", "languages": ["python", "java", "javascript", "go", "php", "ruby"]}', '{"total_functions": 2100000, "languages": 6}', 'datasets/github/CodeSearchNet/data/'),

(7, 'v1.0', '{"format": "jsonl", "encoding": "utf-8"}', '{"total_articles": 15800000, "size_gb": 12}', 'datasets/commoncrawl/Common-Crawl-News/news.jsonl'),

(8, 'v1.0', '{"format": "json", "encoding": "utf-8"}', '{"total_images": 118000, "captions_per_image": 5}', 'datasets/microsoft/MS-COCO-Captions/annotations.json');

-- 插入标签数据
INSERT INTO dataset_tags (dataset_id, name) VALUES
(1, 'reasoning'),
(1, 'mixture-of-experts'),
(1, 'llm'),
(1, 'complex-reasoning'),

(2, 'logic'),
(2, 'reasoning'),
(2, 'synthetic'),
(2, 'qa'),

(3, 'safety'),
(3, 'alignment'),
(3, 'chinese'),
(3, 'refusal'),

(4, 'mmlu'),
(4, 'benchmark'),
(4, 'evaluation'),
(4, 'multiple-choice'),

(5, 'chinese'),
(5, 'web-text'),
(5, 'pre-training'),
(5, 'large-scale'),

(6, 'code'),
(6, 'search'),
(6, 'programming'),
(6, 'multi-language'),

(7, 'news'),
(7, 'web-crawl'),
(7, 'large-scale'),
(7, 'multilingual'),

(8, 'computer-vision'),
(8, 'captions'),
(8, 'images'),
(8, 'coco');

-- 插入一些点赞记录
INSERT INTO dataset_likes (dataset_id, user_id) VALUES
(1, 'user_001'),
(1, 'user_002'),
(1, 'user_003'),
(2, 'user_001'),
(3, 'user_002'),
(4, 'user_001'),
(4, 'user_003'),
(5, 'user_002'),
(8, 'user_001'),
(8, 'user_002'),
(8, 'user_003');

-- 插入一些下载记录
INSERT INTO dataset_downloads (dataset_id, user_id, ip_address, user_agent) VALUES
(1, 'user_001', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(1, 'user_002', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
(2, 'user_003', '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'),
(3, 'user_001', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
(4, 'user_002', '192.168.1.101', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
(5, 'user_003', '192.168.1.102', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'),
(8, 'user_001', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

-- 创建视图：数据集统计视图
CREATE VIEW dataset_stats_view AS
SELECT 
    d.id,
    d.name,
    d.owner,
    d.downloads,
    d.likes,
    COUNT(DISTINCT dv.id) as version_count,
    COUNT(DISTINCT dt.id) as tag_count,
    d.created_at,
    d.updated_at
FROM datasets d
LEFT JOIN dataset_versions dv ON d.id = dv.dataset_id
LEFT JOIN dataset_tags dt ON d.id = dt.dataset_id
GROUP BY d.id, d.name, d.owner, d.downloads, d.likes, d.created_at, d.updated_at;

-- 创建视图：热门数据集视图
CREATE VIEW trending_datasets_view AS
SELECT 
    d.*,
    (d.likes * 2 + d.downloads * 0.1 + CASE WHEN d.featured THEN 100 ELSE 0 END) as trending_score
FROM datasets d
ORDER BY trending_score DESC, d.updated_at DESC;

-- 查询验证数据
SELECT 'Datasets created:' as info, COUNT(*) as count FROM datasets
UNION ALL
SELECT 'Dataset versions created:', COUNT(*) FROM dataset_versions
UNION ALL
SELECT 'Dataset tags created:', COUNT(*) FROM dataset_tags
UNION ALL
SELECT 'Dataset likes created:', COUNT(*) FROM dataset_likes
UNION ALL
SELECT 'Dataset downloads created:', COUNT(*) FROM dataset_downloads;

-- 显示表结构信息
\d datasets
\d dataset_versions
\d dataset_tags
\d dataset_likes
\d dataset_downloads

COMMENT ON TABLE datasets IS '数据集主表';
COMMENT ON TABLE dataset_versions IS '数据集版本表';
COMMENT ON TABLE dataset_tags IS '数据集标签表';
COMMENT ON TABLE dataset_likes IS '数据集点赞记录表';
COMMENT ON TABLE dataset_downloads IS '数据集下载记录表';

-- 执行完成提示
SELECT '✅ 数据集相关表和数据创建完成！' as status; 