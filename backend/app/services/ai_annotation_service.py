import os
import base64
import requests
from typing import List, Dict, Any, Optional
from PIL import Image
from io import BytesIO
import cv2
import numpy as np
from app.models import RawData, AnnotationType, LLMConfig, ProviderType
from app.services.storage_service import StorageService
from app.services.llm_conversion_service import LLMConversionService
from langchain.schema import HumanMessage, SystemMessage
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    whisper = None


class AIAnnotationService:
    """AI辅助标注服务"""
    
    def __init__(self):
        self.storage_service = StorageService()
        self.llm_service = LLMConversionService()
        
        # 初始化Whisper模型（本地模型，不依赖配置）
        self.whisper_model = None
        self._init_whisper()
    
    def _init_whisper(self):
        """初始化Whisper模型，支持离线环境"""
        if not WHISPER_AVAILABLE:
            print("Whisper包未安装，语音转录功能不可用")
            return
        
        try:
            # 设置缓存目录，优先使用本地缓存
            import os
            cache_dir = os.environ.get('WHISPER_CACHE_DIR', '/root/.cache/whisper')
            os.makedirs(cache_dir, exist_ok=True)
            
            # 检查本地是否已有模型文件
            model_path = os.path.join(cache_dir, "base.pt")
            if os.path.exists(model_path):
                print("使用本地Whisper模型")
            else:
                print("本地Whisper模型不存在，将尝试下载（如果有网络连接）")
            
            # 加载模型，指定缓存目录
            self.whisper_model = whisper.load_model("base", download_root=cache_dir)
            print("✅ Whisper模型加载成功")
            
        except Exception as e:
            print(f"⚠️ Whisper模型加载失败: {e}")
            print("   语音转录功能将不可用，但不影响其他功能")
            self.whisper_model = None
    
    def _get_default_llm_config(self, supports_vision: bool = False) -> Optional[LLMConfig]:
        """获取默认的LLM配置"""
        try:
            query = LLMConfig.query.filter(
                LLMConfig.is_active == True,
                LLMConfig.is_default == True
            )
            
            if supports_vision:
                query = query.filter(LLMConfig.supports_vision == True)
            
            return query.first()
        except Exception as e:
            print(f"获取LLM配置失败: {e}")
            return None
    
    def _get_llm_config_by_provider(self, provider: str, supports_vision: bool = False) -> Optional[LLMConfig]:
        """根据提供商获取LLM配置"""
        try:
            provider_enum = ProviderType(provider.upper())
            query = LLMConfig.query.filter(
                LLMConfig.is_active == True,
                LLMConfig.provider == provider_enum
            )
            
            if supports_vision:
                query = query.filter(LLMConfig.supports_vision == True)
            
            return query.first()
        except Exception as e:
            print(f"获取LLM配置失败: {e}")
            return None

    async def generate_image_qa(self, raw_data: RawData, questions: List[str] = None, 
                               model_config: Dict[str, Any] = None,
                               model_provider: str = "openai",
                               region: Dict[str, float] = None) -> Dict[str, Any]:
        """
        为图片生成问答标注（功能开发中）
        
        Args:
            raw_data: 原始数据对象
            questions: 用户提供的问题列表，如果为空则生成默认问题
            model_config: 指定的模型配置信息
            model_provider: 模型提供商 (兼容参数)
            region: 选中的图片区域
        
        Returns:
            包含问答对的字典
        """
        # 功能开发中，返回占位符响应
        return {
            "qa_pairs": [],
            "metadata": {
                "error": "AI图像问答功能正在开发中，暂时无法使用",
                "total_questions": 0,
                "avg_confidence": 0,
                "timestamp": self._get_timestamp()
            }
        }
    
    async def generate_image_caption(self, raw_data: RawData, 
                                   model_config: Dict[str, Any] = None,
                                   model_provider: str = "openai") -> Dict[str, Any]:
        """
        为图片生成描述标注
        
        Args:
            raw_data: 原始数据对象
            model_provider: 模型提供商
        
        Returns:
            包含图片描述的字典
        """
        if raw_data.file_category != 'image':
            raise ValueError("只能对图片数据生成描述标注")
        
        # 获取LLM配置
        llm_config = None
        
        # 优先使用前端指定的模型配置
        if model_config and model_config.get('id'):
            from app.models import LLMConfig
            llm_config = LLMConfig.query.get(model_config['id'])
            if llm_config and not llm_config.supports_vision:
                return {
                    "caption": "",
                    "confidence": 0.0,
                    "metadata": {
                        "error": f"选中的模型 {llm_config.name} 不支持视觉功能",
                        "model_name": llm_config.name,
                        "timestamp": self._get_timestamp()
                    }
                }
        
        # 如果没有指定模型或模型不存在，尝试获取默认模型
        if not llm_config:
            llm_config = self._get_llm_config_by_provider(model_provider, supports_vision=True)
            if not llm_config:
                llm_config = self._get_default_llm_config(supports_vision=True)
                if not llm_config:
                    return {
                        "caption": "",
                        "confidence": 0.0,
                        "metadata": {
                            "error": f"未找到可用的视觉模型配置，请在LLM配置中添加支持视觉的模型",
                            "model_provider": model_provider,
                            "timestamp": self._get_timestamp()
                        }
                    }
        
        try:
            # 获取图片数据
            image_data = await self._get_image_data(raw_data)
            
            # 获取LLM客户端
            llm_client = self.llm_service.get_llm_client(llm_config)
            
            # 生成描述
            result = await self._generate_caption_with_llm(llm_client, image_data, llm_config)
            
            return {
                "caption": result.get("caption", ""),
                "confidence": result.get("confidence", 0.0),
                "metadata": {
                    "model_provider": llm_config.provider.value,
                    "model_name": llm_config.model_name,
                    "image_dimensions": image_data.get("dimensions"),
                    "timestamp": self._get_timestamp()
                }
            }
            
        except Exception as e:
            raise Exception(f"生成图片描述失败: {str(e)}")
    
    async def generate_video_transcript(self, raw_data: RawData, 
                                      language: str = "zh") -> Dict[str, Any]:
        """
        为视频生成字幕标注
        
        Args:
            raw_data: 原始数据对象
            language: 语言代码
        
        Returns:
            包含字幕片段的字典
        """
        if raw_data.file_category != 'video':
            raise ValueError("只能对视频数据生成字幕标注")
        
        if not WHISPER_AVAILABLE or not self.whisper_model:
            error_msg = "Whisper包未安装" if not WHISPER_AVAILABLE else "Whisper模型未加载"
            return {
                "transcript_segments": [],
                "language": language,
                "metadata": {
                    "error": f"{error_msg}，无法进行语音转录。请确保安装正确的openai-whisper包",
                    "model": "whisper-base",
                    "total_duration": 0,
                    "total_segments": 0,
                    "avg_confidence": 0,
                    "timestamp": self._get_timestamp()
                }
            }
        
        try:
            # 从视频中提取音频
            audio_path = await self._extract_audio_from_video(raw_data)
            
            # 使用Whisper进行语音转录
            result = self.whisper_model.transcribe(audio_path, language=language)
            
            # 转换为片段格式
            segments = []
            for segment in result.get("segments", []):
                segments.append({
                    "start_time": segment["start"],
                    "end_time": segment["end"],
                    "text": segment["text"].strip(),
                    "confidence": segment.get("avg_logprob", 0.0),
                    "tokens": segment.get("tokens", [])
                })
            
            return {
                "transcript_segments": segments,
                "language": result.get("language", language),
                "metadata": {
                    "model": "whisper-base",
                    "total_duration": max([s["end_time"] for s in segments]) if segments else 0,
                    "total_segments": len(segments),
                    "avg_confidence": sum([s["confidence"] for s in segments]) / len(segments) if segments else 0,
                    "timestamp": self._get_timestamp()
                }
            }
                
        except Exception as e:
            raise Exception(f"生成视频字幕失败: {str(e)}")
        finally:
            # 清理临时音频文件
            if 'audio_path' in locals() and os.path.exists(audio_path):
                os.remove(audio_path)
    
    async def detect_objects_in_image(self, raw_data: RawData) -> Dict[str, Any]:
        """
        检测图片中的对象
        
        Args:
            raw_data: 原始数据对象
        
        Returns:
            包含对象检测结果的字典
        """
        if raw_data.file_category != 'image':
            raise ValueError("只能对图片数据进行对象检测")
        
        try:
            # 获取图片数据
            image_data = await self._get_image_data(raw_data)
            
            # 使用OpenCV进行基本的对象检测（这里是简化版，实际应该用YOLO等模型）
            objects = await self._detect_objects_opencv(image_data)
            
            return {
                "objects": objects,
                "metadata": {
                    "detection_model": "opencv_basic",
                    "image_dimensions": image_data.get("dimensions"),
                    "total_objects": len(objects),
                    "timestamp": self._get_timestamp()
                }
            }
            
        except Exception as e:
            raise Exception(f"对象检测失败: {str(e)}")
    
    async def _get_image_data(self, raw_data: RawData) -> Dict[str, Any]:
        """获取图片数据"""
        try:
            # 从MinIO获取图片文件
            image_bytes = await self.storage_service.get_file(raw_data.minio_object_name)
            
            # 转换为PIL Image
            image = Image.open(BytesIO(image_bytes))
            
            # 转换为base64编码
            buffered = BytesIO()
            image.save(buffered, format=image.format or "JPEG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode()
            
            return {
                "base64": img_base64,
                "format": image.format,
                "dimensions": {"width": image.width, "height": image.height},
                "mode": image.mode
            }
            
        except Exception as e:
            raise Exception(f"获取图片数据失败: {str(e)}")
    
    async def generate_image_qa_from_library_file(self, library_file, questions: List[str] = None, 
                                                model_config: Dict[str, Any] = None,
                                                model_provider: str = "openai",
                                                region: Dict[str, float] = None) -> Dict[str, Any]:
        """
        为LibraryFile中的图片生成问答标注（功能开发中）
        
        Args:
            library_file: LibraryFile对象
            questions: 用户提供的问题列表，如果为空则生成默认问题
            model_config: 指定的模型配置信息
            model_provider: 模型提供商 (兼容参数)
            region: 选中的图片区域
        
        Returns:
            包含问答对的字典
        """
        # 功能开发中，返回占位符响应
        return {
            "qa_pairs": [],
            "metadata": {
                "error": "AI图像问答功能正在开发中，暂时无法使用",
                "total_questions": 0,
                "avg_confidence": 0,
                "timestamp": self._get_timestamp()
            }
        }
    
    async def _get_image_data_from_library_file(self, library_file) -> Dict[str, Any]:
        """从LibraryFile获取图片数据"""
        try:
            # 从MinIO获取图片文件，使用LibraryFile中记录的bucket名称
            bucket_name = library_file.minio_bucket or 'raw-data'
            image_bytes = self.storage_service.get_file(
                library_file.minio_object_name, 
                bucket_name=bucket_name
            )
            
            # 转换为PIL Image
            image = Image.open(BytesIO(image_bytes))
            
            # 转换为base64编码
            buffered = BytesIO()
            image.save(buffered, format=image.format or "JPEG")
            img_base64 = base64.b64encode(buffered.getvalue()).decode()
            
            return {
                "base64": img_base64,
                "format": image.format,
                "dimensions": {"width": image.width, "height": image.height},
                "mode": image.mode
            }
            
        except Exception as e:
            raise Exception(f"获取LibraryFile图片数据失败: {str(e)}")
    
    def _generate_default_image_questions_for_library_file(self, library_file) -> List[str]:
        """为LibraryFile生成默认的图片问题"""
        return [
            "这张图片中显示了什么？",
            "描述图片中的主要对象和它们的位置。",
            "图片中有哪些颜色？",
            "这张图片的场景或背景是什么？",
            "图片中是否有人物？如果有，他们在做什么？",
            "这张图片可能是在什么时间或地点拍摄的？",
            "图片的整体氛围或情绪是什么？",
            "图片中有没有文字或标志？如果有，写的是什么？"
        ]
    
    async def _ask_vision_model(self, llm_client, image_data: Dict, question: str, llm_config: LLMConfig, region: Dict[str, float] = None) -> Dict[str, Any]:
        """使用视觉模型回答图片相关问题"""
        try:
            # 构建问题文本，如果有区域信息则添加区域描述
            question_text = question
            if region:
                region_desc = f"请注意这个问题主要关于图片中的特定区域（位置: x={region.get('x', 0):.0f}, y={region.get('y', 0):.0f}, 宽度={region.get('width', 0):.0f}, 高度={region.get('height', 0):.0f}）。{question}"
                question_text = region_desc
            
            # 构建消息内容
            content_parts = [
                {"type": "text", "text": question_text},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_data['base64']}"
                    }
                }
            ]
            
            # 创建消息
            messages = [HumanMessage(content=content_parts)]
            
            # 调用LLM
            response = llm_client.invoke(messages)
            
            return {
                "text": response.content,
                "confidence": 0.85,  # 默认置信度
                "model": llm_config.model_name
            }
            
        except Exception as e:
            return {"text": f"模型调用失败: {str(e)}", "confidence": 0.0}
    
    async def _generate_caption_with_llm(self, llm_client, image_data: Dict, llm_config: LLMConfig) -> Dict[str, Any]:
        """使用LLM生成图片描述"""
        try:
            # 构建消息内容
            content_parts = [
                {"type": "text", "text": "请详细描述这张图片的内容，包括主要对象、场景、颜色、氛围等。"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_data['base64']}"
                    }
                }
            ]
            
            # 创建消息
            messages = [HumanMessage(content=content_parts)]
            
            # 调用LLM
            response = llm_client.invoke(messages)
            
            return {
                "caption": response.content,
                "confidence": 0.85,
                "model": llm_config.model_name
            }
            
        except Exception as e:
            return {"caption": f"生成描述失败: {str(e)}", "confidence": 0.0}
    
    def _generate_default_image_questions(self, raw_data: RawData) -> List[str]:
        """生成默认的图片问题"""
        return [
            "这张图片中显示了什么？",
            "描述图片中的主要对象和它们的位置。",
            "图片中有哪些颜色？",
            "这张图片的场景或背景是什么？",
            "图片中是否有人物？如果有，他们在做什么？",
            "这张图片可能是在什么时间或地点拍摄的？",
            "图片的整体氛围或情绪是什么？",
            "图片中有没有文字或标志？如果有，写的是什么？"
        ]
    
    async def _extract_audio_from_video(self, raw_data: RawData) -> str:
        """从视频中提取音频"""
        try:
            # 获取视频文件
            video_bytes = await self.storage_service.get_file(raw_data.minio_object_name)
            
            # 保存临时视频文件
            temp_video_path = f"/tmp/temp_video_{raw_data.id}.mp4"
            with open(temp_video_path, 'wb') as f:
                f.write(video_bytes)
            
            # 使用OpenCV提取音频
            temp_audio_path = f"/tmp/temp_audio_{raw_data.id}.wav"
            
            # 使用ffmpeg提取音频（需要安装ffmpeg）
            import subprocess
            subprocess.run([
                'ffmpeg', '-i', temp_video_path, 
                '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', 
                temp_audio_path
            ], check=True, capture_output=True)
            
            # 清理临时视频文件
            os.remove(temp_video_path)
            
            return temp_audio_path
            
        except Exception as e:
            raise Exception(f"音频提取失败: {str(e)}")
    
    async def _detect_objects_opencv(self, image_data: Dict) -> List[Dict[str, Any]]:
        """使用OpenCV进行基础对象检测"""
        try:
            # 转换图片格式
            image_bytes = base64.b64decode(image_data['base64'])
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            # 使用Haar级联检测器检测人脸（示例）
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            
            objects = []
            for (x, y, w, h) in faces:
                objects.append({
                    "label": "face",
                    "confidence": 0.75,
                    "bbox": {
                        "x": int(x),
                        "y": int(y),
                        "width": int(w),
                        "height": int(h)
                    }
                })
            
            return objects
            
        except Exception as e:
            raise Exception(f"OpenCV对象检测失败: {str(e)}")
    
    def _get_timestamp(self) -> str:
        """获取当前时间戳"""
        from datetime import datetime
        return datetime.utcnow().isoformat()


# 创建全局服务实例
ai_annotation_service = AIAnnotationService()