import json
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from io import BytesIO, StringIO
from PIL import Image
import base64
import logging
from flask import current_app
from app.services.storage_service import storage_service
from app.models.dataset_version import EnhancedDatasetFile
import tempfile
import os

logger = logging.getLogger(__name__)

class DataPreviewService:
    """数据预览服务"""
    
    @staticmethod
    def generate_preview(file: EnhancedDatasetFile, max_items: int = 10) -> Dict[str, Any]:
        """
        生成数据预览
        
        Args:
            file: 数据集文件对象
            max_items: 最大预览条目数
            
        Returns:
            预览数据字典
        """
        try:
            file_type = file.file_type.lower()
            
            if file_type in ['text', 'txt', 'csv', 'json', 'jsonl']:
                return DataPreviewService._preview_text_data(file, max_items)
            elif file_type in ['image', 'jpg', 'jpeg', 'png', 'bmp', 'gif']:
                return DataPreviewService._preview_image_data(file, max_items)
            elif file_type in ['pointcloud', 'ply', 'pcd', 'xyz']:
                return DataPreviewService._preview_pointcloud_data(file, max_items)
            elif file_type in ['audio', 'wav', 'mp3', 'flac']:
                return DataPreviewService._preview_audio_data(file, max_items)
            elif file_type in ['video', 'mp4', 'avi', 'mov']:
                return DataPreviewService._preview_video_data(file, max_items)
            else:
                return {
                    'type': 'unsupported',
                    'message': f'不支持的文件类型: {file_type}',
                    'items': []
                }
                
        except Exception as e:
            logger.error(f"生成预览失败: {str(e)}")
            return {
                'type': 'error',
                'message': f'预览生成失败: {str(e)}',
                'items': []
            }
    
    @staticmethod
    def _preview_text_data(file: EnhancedDatasetFile, max_items: int) -> Dict[str, Any]:
        """预览文本数据"""
        try:
            # 从MinIO下载文件内容
            with tempfile.NamedTemporaryFile() as tmp_file:
                storage_service.download_file(
                    file.minio_bucket or 'datasets',  # 默认使用datasets bucket
                    file.minio_object_name,
                    tmp_file.name
                )
                
                # 根据文件类型处理
                file_ext = file.filename.split('.')[-1].lower()
                
                if file_ext == 'csv':
                    return DataPreviewService._preview_csv(tmp_file.name, max_items)
                elif file_ext in ['json', 'jsonl']:
                    return DataPreviewService._preview_json(tmp_file.name, max_items)
                else:
                    return DataPreviewService._preview_plain_text(tmp_file.name, max_items)
                    
        except Exception as e:
            logger.error(f"预览文本数据失败: {str(e)}")
            raise
    
    @staticmethod
    def _preview_csv(file_path: str, max_items: int) -> Dict[str, Any]:
        """预览CSV文件"""
        try:
            # 尝试不同的编码
            encodings = ['utf-8', 'gbk', 'gb2312', 'utf-16']
            df = None
            
            for encoding in encodings:
                try:
                    df = pd.read_csv(file_path, encoding=encoding, nrows=max_items)
                    break
                except UnicodeDecodeError:
                    continue
            
            if df is None:
                raise Exception("无法解码CSV文件")
            
            # 获取基本信息
            total_rows = len(df)
            columns = df.columns.tolist()
            
            # 转换数据为预览格式
            preview_data = []
            for idx, row in df.iterrows():
                preview_data.append({
                    'index': int(idx),
                    'data': {col: DataPreviewService._safe_convert(row[col]) for col in columns}
                })
            
            # 生成统计信息
            stats = {
                'total_rows': total_rows,
                'total_columns': len(columns),
                'columns': columns,
                'data_types': {col: str(df[col].dtype) for col in columns}
            }
            
            return {
                'type': 'tabular',
                'format': 'csv',
                'stats': stats,
                'items': preview_data,
                'total_items': total_rows,
                'preview_count': len(preview_data)
            }
            
        except Exception as e:
            logger.error(f"预览CSV失败: {str(e)}")
            raise
    
    @staticmethod
    def _preview_json(file_path: str, max_items: int) -> Dict[str, Any]:
        """预览JSON/JSONL文件"""
        try:
            preview_data = []
            total_items = 0
            
            with open(file_path, 'r', encoding='utf-8') as f:
                if file_path.endswith('.jsonl'):
                    # JSONL格式：每行一个JSON对象
                    for line_num, line in enumerate(f):
                        if line_num >= max_items:
                            break
                        if line.strip():
                            try:
                                data = json.loads(line.strip())
                                preview_data.append({
                                    'index': line_num,
                                    'data': data
                                })
                            except json.JSONDecodeError:
                                continue
                    
                    # 计算总行数
                    f.seek(0)
                    total_items = sum(1 for line in f if line.strip())
                else:
                    # 标准JSON格式
                    data = json.load(f)
                    if isinstance(data, list):
                        total_items = len(data)
                        for i, item in enumerate(data[:max_items]):
                            preview_data.append({
                                'index': i,
                                'data': item
                            })
                    else:
                        total_items = 1
                        preview_data.append({
                            'index': 0,
                            'data': data
                        })
            
            return {
                'type': 'json',
                'format': 'jsonl' if file_path.endswith('.jsonl') else 'json',
                'items': preview_data,
                'total_items': total_items,
                'preview_count': len(preview_data)
            }
            
        except Exception as e:
            logger.error(f"预览JSON失败: {str(e)}")
            raise
    
    @staticmethod
    def _preview_plain_text(file_path: str, max_items: int) -> Dict[str, Any]:
        """预览纯文本文件"""
        try:
            preview_data = []
            
            # 尝试不同编码
            encodings = ['utf-8', 'gbk', 'gb2312']
            content = None
            
            for encoding in encodings:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        lines = f.readlines()
                    content = lines
                    break
                except UnicodeDecodeError:
                    continue
            
            if content is None:
                raise Exception("无法解码文本文件")
            
            total_lines = len(content)
            
            for i, line in enumerate(content[:max_items]):
                preview_data.append({
                    'index': i + 1,
                    'content': line.rstrip('\n\r')
                })
            
            return {
                'type': 'text',
                'format': 'plain_text',
                'items': preview_data,
                'total_items': total_lines,
                'preview_count': len(preview_data)
            }
            
        except Exception as e:
            logger.error(f"预览文本失败: {str(e)}")
            raise
    
    @staticmethod
    def _preview_image_data(file: EnhancedDatasetFile, max_items: int) -> Dict[str, Any]:
        """预览图像数据"""
        try:
            # 如果是单个图像文件
            if file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.gif')):
                with tempfile.NamedTemporaryFile() as tmp_file:
                    storage_service.download_file(
                        file.minio_bucket or 'datasets',  # 默认使用datasets bucket
                        file.minio_object_name,
                        tmp_file.name
                    )
                    
                    # 生成缩略图
                    with Image.open(tmp_file.name) as img:
                        # 转换为RGB（如果需要）
                        if img.mode in ('RGBA', 'LA'):
                            img = img.convert('RGB')
                        
                        # 生成缩略图
                        img.thumbnail((200, 200), Image.Resampling.LANCZOS)
                        
                        # 转换为base64
                        buffer = BytesIO()
                        img.save(buffer, format='JPEG')
                        img_base64 = base64.b64encode(buffer.getvalue()).decode()
                        
                        # 获取原始图像信息
                        with Image.open(tmp_file.name) as orig_img:
                            width, height = orig_img.size
                            mode = orig_img.mode
                        
                        return {
                            'type': 'image',
                            'format': 'single_image',
                            'items': [{
                                'index': 0,
                                'filename': file.filename,
                                'thumbnail': f'data:image/jpeg;base64,{img_base64}',
                                'metadata': {
                                    'width': width,
                                    'height': height,
                                    'mode': mode,
                                    'size': file.file_size
                                }
                            }],
                            'total_items': 1,
                            'preview_count': 1
                        }
            
            # TODO: 处理图像数据集文件夹或压缩包
            return {
                'type': 'image',
                'format': 'dataset',
                'message': '图像数据集预览功能开发中',
                'items': []
            }
            
        except Exception as e:
            logger.error(f"预览图像失败: {str(e)}")
            raise
    
    @staticmethod
    def _preview_pointcloud_data(file: EnhancedDatasetFile, max_items: int) -> Dict[str, Any]:
        """预览点云数据"""
        try:
            # TODO: 实现点云预览
            # 可以使用open3d或者其他点云处理库
            return {
                'type': 'pointcloud',
                'format': 'unsupported',
                'message': '点云预览功能开发中',
                'items': []
            }
            
        except Exception as e:
            logger.error(f"预览点云失败: {str(e)}")
            raise
    
    @staticmethod
    def _preview_audio_data(file: EnhancedDatasetFile, max_items: int) -> Dict[str, Any]:
        """预览音频数据"""
        try:
            # TODO: 实现音频预览
            # 可以生成波形图或提取音频特征
            return {
                'type': 'audio',
                'format': 'unsupported',
                'message': '音频预览功能开发中',
                'items': []
            }
            
        except Exception as e:
            logger.error(f"预览音频失败: {str(e)}")
            raise
    
    @staticmethod
    def _preview_video_data(file: EnhancedDatasetFile, max_items: int) -> Dict[str, Any]:
        """预览视频数据"""
        try:
            # TODO: 实现视频预览
            # 可以提取关键帧或生成缩略图
            return {
                'type': 'video',
                'format': 'unsupported',
                'message': '视频预览功能开发中',
                'items': []
            }
            
        except Exception as e:
            logger.error(f"预览视频失败: {str(e)}")
            raise
    
    @staticmethod
    def _safe_convert(value) -> Any:
        """安全转换数据类型为JSON可序列化的格式"""
        if pd.isna(value):
            return None
        if isinstance(value, (np.integer, np.floating)):
            return float(value) if isinstance(value, np.floating) else int(value)
        if isinstance(value, np.ndarray):
            return value.tolist()
        return value
    
    @staticmethod
    def save_preview_data(file: EnhancedDatasetFile, preview_data: Dict[str, Any]) -> None:
        """保存预览数据到文件对象"""
        try:
            file.preview_data = preview_data
            from app.db import db
            db.session.commit()
            logger.info(f"预览数据已保存到文件 {file.filename}")
        except Exception as e:
            logger.error(f"保存预览数据失败: {str(e)}")
            raise 