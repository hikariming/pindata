import os
import shutil

def ensure_dir_exists(dir_path):
    '''确保目录存在，如果不存在则创建'''
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)
        print(f"Created directory: {dir_path}")

def save_text_to_file(text, file_path, encoding='utf-8'):
    '''将文本内容保存到文件'''
    try:
        ensure_dir_exists(os.path.dirname(file_path))
        with open(file_path, 'w', encoding=encoding) as f:
            f.write(text)
        print(f"Successfully saved text to {file_path}")
    except Exception as e:
        print(f"Error saving text to {file_path}: {e}")

def read_text_from_file(file_path, encoding='utf-8'):
    '''从文件读取文本内容'''
    try:
        if not os.path.exists(file_path):
            print(f"File not found: {file_path}")
            return None
        with open(file_path, 'r', encoding=encoding) as f:
            content = f.read()
        return content
    except Exception as e:
        print(f"Error reading text from {file_path}: {e}")
        return None

# 其他文件操作相关的工具函数可以加在这里
# 例如：计算文件哈希、临时文件管理等 