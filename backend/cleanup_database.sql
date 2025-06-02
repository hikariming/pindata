-- 清理数据库中的任务和转换相关数据
-- 注意：这将删除所有转换任务和相关数据，请谨慎执行

BEGIN;

-- 1. 清理转换文件详情
DELETE FROM conversion_file_details;
COMMENT ON TABLE conversion_file_details IS '清理转换文件详情';

-- 2. 清理转换任务
DELETE FROM conversion_jobs;
COMMENT ON TABLE conversion_jobs IS '清理转换任务';

-- 3. 清理通用任务
DELETE FROM tasks;
COMMENT ON TABLE tasks IS '清理通用任务';

-- 4. 重置文件状态到初始状态
UPDATE library_files SET 
    process_status = 'pending',
    converted_format = NULL,
    converted_object_name = NULL,
    converted_file_size = NULL,
    conversion_method = NULL,
    conversion_error = NULL,
    processed_at = NULL,
    minio_bucket = 'raw-data'  -- 确保bucket名称正确
WHERE 1=1;

-- 5. 重置文件库统计信息
UPDATE libraries SET 
    processed_count = 0,
    processing_count = 0,
    pending_count = file_count,
    md_count = 0
WHERE 1=1;

-- 显示清理结果
SELECT 'conversion_file_details' as table_name, COUNT(*) as remaining_count FROM conversion_file_details
UNION ALL
SELECT 'conversion_jobs' as table_name, COUNT(*) as remaining_count FROM conversion_jobs  
UNION ALL
SELECT 'tasks' as table_name, COUNT(*) as remaining_count FROM tasks
UNION ALL
SELECT 'library_files_pending' as table_name, COUNT(*) as count FROM library_files WHERE process_status = 'pending'
UNION ALL
SELECT 'library_files_total' as table_name, COUNT(*) as count FROM library_files;

COMMIT; 