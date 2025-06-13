import os
import base64
import requests
from typing import List, Dict, Any, Optional
from PIL import Image
from io import BytesIO
import cv2
import numpy as np
from app.models import RawData, AnnotationType
from app.services.storage_service import StorageService
import openai
import google.generativeai as genai
from anthropic import Anthropic
import whisper


class AIAnnotationService:
    """AI辅助标注服务"""
    
    def __init__(self):
        self.storage_service = StorageService()
        
        # 初始化各种AI模型客户端
        self.openai_client = None
        self.anthropic_client = None
        self.whisper_model = None
        
        # 从环境变量获取API密钥
        self._init_ai_clients()
    
    def _init_ai_clients(self):
        """初始化AI客户端"""
        try:
            # OpenAI
            if os.getenv('OPENAI_API_KEY'):
                openai.api_key = os.getenv('OPENAI_API_KEY')
                self.openai_client = openai
            
            # Anthropic Claude
            if os.getenv('ANTHROPIC_API_KEY'):
                self.anthropic_client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
            
            # Google Gemini
            if os.getenv('GOOGLE_API_KEY'):
                genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
            
            # Whisper (本地模型)
            try:
                self.whisper_model = whisper.load_model("base")
            except Exception as e:
                print(f"Whisper模型加载失败: {e}")
                
        except Exception as e:
            print(f"AI客户端初始化失败: {e}")
    
    async def generate_image_qa(self, raw_data: RawData, questions: List[str] = None, 
                               model_provider: str = "openai") -> Dict[str, Any]:
        """
        为图片生成问答标注
        
        Args:
            raw_data: 原始数据对象
            questions: 用户提供的问题列表，如果为空则生成默认问题
            model_provider: 模型提供商 (openai, anthropic, google)
        
        Returns:
            包含问答对的字典
        """
        if raw_data.file_category != 'image':
            raise ValueError("只能对图片数据生成问答标注")
        
        try:
            # 获取图片数据
            image_data = await self._get_image_data(raw_data)
            
            # 如果没有提供问题，生成默认问题
            if not questions:
                questions = self._generate_default_image_questions(raw_data)
            
            # 根据不同的模型提供商生成答案
            qa_pairs = []
            
            for question in questions:
                if model_provider == "openai" and self.openai_client:
                    answer = await self._ask_openai_vision(image_data, question)
                elif model_provider == "anthropic" and self.anthropic_client:
                    answer = await self._ask_claude_vision(image_data, question)
                elif model_provider == "google":
                    answer = await self._ask_gemini_vision(image_data, question)
                else:
                    answer = {"text": "AI服务暂不可用", "confidence": 0.0}
                
                qa_pairs.append({
                    "question": question,
                    "answer": answer.get("text", ""),
                    "confidence": answer.get("confidence", 0.0),
                    "model": model_provider,
                    "timestamp": self._get_timestamp()
                })
            
            return {
                "qa_pairs": qa_pairs,
                "metadata": {
                    "model_provider": model_provider,
                    "image_dimensions": image_data.get("dimensions"),
                    "total_questions": len(questions),
                    "avg_confidence": sum([qa["confidence"] for qa in qa_pairs]) / len(qa_pairs) if qa_pairs else 0
                }
            }
            
        except Exception as e:
            raise Exception(f"生成图片问答失败: {str(e)}")
    
    async def generate_image_caption(self, raw_data: RawData, 
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
        
        try:
            # 获取图片数据
            image_data = await self._get_image_data(raw_data)
            
            # 生成描述
            if model_provider == "openai" and self.openai_client:
                result = await self._generate_openai_caption(image_data)
            elif model_provider == "anthropic" and self.anthropic_client:
                result = await self._generate_claude_caption(image_data)
            elif model_provider == "google":
                result = await self._generate_gemini_caption(image_data)
            else:
                result = {"caption": "AI服务暂不可用", "confidence": 0.0}
            
            return {
                "caption": result.get("caption", ""),
                "confidence": result.get("confidence", 0.0),
                "metadata": {
                    "model_provider": model_provider,
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
        
        try:
            # 从视频中提取音频
            audio_path = await self._extract_audio_from_video(raw_data)
            
            # 使用Whisper进行语音转录
            if self.whisper_model:
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
            else:
                raise Exception("Whisper模型未加载")
                
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
    
    async def _ask_openai_vision(self, image_data: Dict, question: str) -> Dict[str, Any]:
        """使用OpenAI GPT-4V回答图片相关问题"""
        try:
            response = self.openai_client.ChatCompletion.create(
                model="gpt-4-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": question},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_data['base64']}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=500
            )
            
            answer_text = response.choices[0].message.content
            
            return {
                "text": answer_text,
                "confidence": 0.85,  # GPT-4V通常置信度较高
                "model": "gpt-4-vision-preview"
            }
            
        except Exception as e:
            return {"text": f"OpenAI API调用失败: {str(e)}", "confidence": 0.0}
    
    async def _ask_claude_vision(self, image_data: Dict, question: str) -> Dict[str, Any]:
        """使用Claude Vision回答图片相关问题"""
        try:
            message = self.anthropic_client.messages.create(
                model="claude-3-sonnet-20240229",
                max_tokens=500,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": image_data['base64']
                                }
                            },
                            {
                                "type": "text",
                                "text": question
                            }
                        ]
                    }
                ]
            )
            
            answer_text = message.content[0].text
            
            return {
                "text": answer_text,
                "confidence": 0.90,  # Claude通常置信度较高
                "model": "claude-3-sonnet"
            }
            
        except Exception as e:
            return {"text": f"Claude API调用失败: {str(e)}", "confidence": 0.0}
    
    async def _ask_gemini_vision(self, image_data: Dict, question: str) -> Dict[str, Any]:
        """使用Google Gemini Vision回答图片相关问题"""
        try:
            model = genai.GenerativeModel('gemini-pro-vision')
            
            # 重新构建PIL图像
            image_bytes = base64.b64decode(image_data['base64'])
            image = Image.open(BytesIO(image_bytes))
            
            response = model.generate_content([question, image])
            
            return {
                "text": response.text,
                "confidence": 0.80,  # Gemini置信度
                "model": "gemini-pro-vision"
            }
            
        except Exception as e:
            return {"text": f"Gemini API调用失败: {str(e)}", "confidence": 0.0}
    
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