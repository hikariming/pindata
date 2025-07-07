"""
中文友好的DataFlow处理服务
"""
import re
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import tempfile
import os

logger = logging.getLogger(__name__)

class ChineseDataFlowService:
    """中文友好的DataFlow处理服务"""
    
    def __init__(self):
        self.logger = logger
    
    def process_chinese_pretrain_filter(self, text: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        中文预训练数据过滤
        
        Args:
            text: 输入文本
            config: 过滤配置
            
        Returns:
            处理结果
        """
        if config is None:
            config = self.get_default_chinese_filter_config()
        
        start_time = datetime.now()
        
        try:
            # 1. 基础清理
            cleaned_text = self._clean_text(text)
            
            # 2. 应用中文友好的过滤器
            filter_results = {}
            
            # 内容空值检查
            if not self._content_null_filter(cleaned_text):
                return self._create_filter_result(text, "", "failed", "内容为空", filter_results, start_time)
            
            # 中文字符数量检查
            if not self._chinese_char_filter(cleaned_text, config.get('min_chars', 20)):
                return self._create_filter_result(text, "", "failed", "字符数量不足", filter_results, start_time)
            
            # 中文句子数量检查
            if not self._chinese_sentence_filter(cleaned_text, config.get('min_sentences', 1), config.get('max_sentences', 1000)):
                return self._create_filter_result(text, "", "failed", "句子数量不符合要求", filter_results, start_time)
            
            # 特殊字符过滤
            if not self._special_char_filter(cleaned_text, config.get('max_special_ratio', 0.3)):
                return self._create_filter_result(text, "", "failed", "特殊字符过多", filter_results, start_time)
            
            # 重复内容检查
            if not self._repetition_filter(cleaned_text, config.get('max_repetition_ratio', 0.3)):
                return self._create_filter_result(text, "", "failed", "重复内容过多", filter_results, start_time)
            
            # 语言质量检查
            quality_score = self._calculate_chinese_quality_score(cleaned_text)
            if quality_score < config.get('min_quality_score', 0.3):
                return self._create_filter_result(text, cleaned_text, "failed", f"质量分数过低: {quality_score:.2f}", filter_results, start_time)
            
            # 通过所有过滤器
            return self._create_filter_result(text, cleaned_text, "passed", "通过所有过滤器", filter_results, start_time, quality_score)
            
        except Exception as e:
            self.logger.error(f"中文预训练数据过滤失败: {str(e)}")
            return self._create_filter_result(text, "", "error", str(e), {}, start_time)
    
    def process_chinese_pretrain_synthesis(self, text: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        中文预训练数据合成
        
        Args:
            text: 输入文本
            config: 合成配置
            
        Returns:
            合成结果
        """
        if config is None:
            config = self.get_default_chinese_synthesis_config()
        
        start_time = datetime.now()
        
        try:
            # 1. 基础清理
            cleaned_text = self._clean_text(text)
            
            # 2. 生成不同形式的内容
            synthesized_content = []
            
            # 问答对话形式
            if config.get('generate_qa', True):
                qa_content = self._generate_chinese_qa(cleaned_text)
                synthesized_content.append({
                    'type': 'qa',
                    'content': qa_content,
                    'description': '问答对话形式'
                })
            
            # 总结摘要形式
            if config.get('generate_summary', True):
                summary_content = self._generate_chinese_summary(cleaned_text)
                synthesized_content.append({
                    'type': 'summary',
                    'content': summary_content,
                    'description': '总结摘要形式'
                })
            
            # 知识点提取
            if config.get('generate_knowledge', True):
                knowledge_content = self._extract_chinese_knowledge(cleaned_text)
                synthesized_content.append({
                    'type': 'knowledge',
                    'content': knowledge_content,
                    'description': '知识点提取'
                })
            
            # 创建合成结果
            result_text = self._combine_synthesized_content(synthesized_content)
            quality_score = self._calculate_synthesis_quality_score(result_text)
            
            return {
                'original_text': text,
                'processed_text': result_text,
                'synthesized_content': synthesized_content,
                'status': 'success',
                'quality_score': quality_score,
                'processing_time': (datetime.now() - start_time).total_seconds(),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"中文预训练数据合成失败: {str(e)}")
            return {
                'original_text': text,
                'processed_text': '',
                'status': 'error',
                'error': str(e),
                'processing_time': (datetime.now() - start_time).total_seconds(),
                'timestamp': datetime.now().isoformat()
            }
    
    def process_custom_task(self, text: str, task_type: str, config: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        自定义任务处理
        
        Args:
            text: 输入文本
            task_type: 任务类型
            config: 任务配置
            
        Returns:
            处理结果
        """
        start_time = datetime.now()
        
        try:
            if task_type == 'chinese_clean':
                # 中文文本清理
                result = self._chinese_text_cleaning(text, config or {})
            elif task_type == 'chinese_segment':
                # 中文分词
                result = self._chinese_text_segmentation(text, config or {})
            elif task_type == 'chinese_extract':
                # 中文信息提取
                result = self._chinese_information_extraction(text, config or {})
            elif task_type == 'chinese_format':
                # 中文格式化
                result = self._chinese_text_formatting(text, config or {})
            else:
                result = f"未知任务类型: {task_type}"
            
            return {
                'original_text': text,
                'processed_text': result,
                'task_type': task_type,
                'status': 'success',
                'processing_time': (datetime.now() - start_time).total_seconds(),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"自定义任务处理失败: {str(e)}")
            return {
                'original_text': text,
                'processed_text': '',
                'task_type': task_type,
                'status': 'error',
                'error': str(e),
                'processing_time': (datetime.now() - start_time).total_seconds(),
                'timestamp': datetime.now().isoformat()
            }
    
    def _clean_text(self, text: str) -> str:
        """清理文本"""
        if not text:
            return ""
        
        # 移除多余空白
        text = re.sub(r'\s+', ' ', text)
        
        # 移除特殊控制字符
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
        
        # 移除HTML标签
        text = re.sub(r'<[^>]+>', '', text)
        
        # 移除多余的标点符号
        text = re.sub(r'[。！？]{2,}', '。', text)
        text = re.sub(r'[，、]{2,}', '，', text)
        
        return text.strip()
    
    def _content_null_filter(self, text: str) -> bool:
        """内容空值过滤"""
        return bool(text and text.strip())
    
    def _chinese_char_filter(self, text: str, min_chars: int = 20) -> bool:
        """中文字符数量过滤"""
        # 移除空白和标点，只计算有效字符
        # 使用更简单安全的方法：只保留中文、英文、数字字符
        clean_text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', '', text)
        return len(clean_text) >= min_chars
    
    def _chinese_sentence_filter(self, text: str, min_sentences: int = 1, max_sentences: int = 1000) -> bool:
        """中文句子数量过滤"""
        # 按中文句号、问号、感叹号分割
        sentences = re.split(r'[。！？]', text)
        # 过滤掉空句子
        sentences = [s.strip() for s in sentences if s.strip()]
        return min_sentences <= len(sentences) <= max_sentences
    
    def _special_char_filter(self, text: str, max_ratio: float = 0.3) -> bool:
        """特殊字符过滤"""
        if not text:
            return False
        
        # 计算特殊字符（非中文、非英文、非数字、非常用标点）的比例
        special_chars = len(re.findall(r'[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？；：""''（）【】\-]', text))
        ratio = special_chars / len(text)
        return ratio <= max_ratio
    
    def _repetition_filter(self, text: str, max_ratio: float = 0.3) -> bool:
        """重复内容过滤"""
        if not text:
            return False
        
        # 检查字符重复
        char_counts = {}
        for char in text:
            if char not in [' ', '\n', '\t']:
                char_counts[char] = char_counts.get(char, 0) + 1
        
        if not char_counts:
            return False
        
        # 计算最高重复率
        max_repeat = max(char_counts.values())
        repeat_ratio = max_repeat / len(text)
        return repeat_ratio <= max_ratio
    
    def _calculate_chinese_quality_score(self, text: str) -> float:
        """计算中文文本质量分数"""
        if not text:
            return 0.0
        
        score = 0.0
        
        # 1. 长度分数 (0-25分)
        length_score = min(25, len(text) / 100 * 25)
        score += length_score
        
        # 2. 中文字符比例 (0-25分)
        chinese_chars = len(re.findall(r'[\u4e00-\u9fa5]', text))
        chinese_ratio = chinese_chars / len(text) if text else 0
        chinese_score = chinese_ratio * 25
        score += chinese_score
        
        # 3. 句子结构完整性 (0-25分)
        sentences = re.split(r'[。！？]', text)
        complete_sentences = [s for s in sentences if s.strip() and len(s.strip()) > 5]
        structure_score = min(25, len(complete_sentences) / max(1, len(sentences)) * 25)
        score += structure_score
        
        # 4. 词汇丰富度 (0-25分)
        words = list(text)  # 中文以字符为单位
        unique_words = set(words)
        diversity_ratio = len(unique_words) / len(words) if words else 0
        diversity_score = diversity_ratio * 25
        score += diversity_score
        
        return min(100.0, score)
    
    def _generate_chinese_qa(self, text: str) -> str:
        """生成中文问答对话"""
        # 简单的规则基于的问答生成
        sentences = re.split(r'[。！？]', text)
        sentences = [s.strip() for s in sentences if s.strip() and len(s.strip()) > 10]
        
        if not sentences:
            return "问：这段内容说了什么？\n答：内容过短，无法提取有效信息。"
        
        # 生成问题
        qa_pairs = []
        
        # 基于内容生成问题
        if len(sentences) > 0:
            first_sentence = sentences[0]
            qa_pairs.append(f"问：文中主要讲述了什么内容？\n答：{first_sentence}。")
        
        if len(sentences) > 1:
            second_sentence = sentences[1]
            qa_pairs.append(f"问：文中还提到了哪些要点？\n答：{second_sentence}。")
        
        # 生成总结性问题
        if len(text) > 100:
            summary = text[:100] + "..."
            qa_pairs.append(f"问：请简要概括这段内容。\n答：{summary}")
        
        return "\n\n".join(qa_pairs)
    
    def _generate_chinese_summary(self, text: str) -> str:
        """生成中文总结摘要"""
        sentences = re.split(r'[。！？]', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return "内容过短，无法生成摘要。"
        
        # 简单的摘要生成：取前几句和关键句子
        summary_sentences = []
        
        # 取第一句作为开头
        if sentences:
            summary_sentences.append(sentences[0])
        
        # 取中间的关键句子
        if len(sentences) > 2:
            middle_idx = len(sentences) // 2
            summary_sentences.append(sentences[middle_idx])
        
        # 取最后一句作为结尾
        if len(sentences) > 1:
            summary_sentences.append(sentences[-1])
        
        summary = "。".join(summary_sentences) + "。"
        return f"摘要：{summary}"
    
    def _extract_chinese_knowledge(self, text: str) -> str:
        """提取中文知识点"""
        # 简单的知识点提取
        knowledge_points = []
        
        # 查找定义性语句
        definitions = re.findall(r'(.{1,20})[是为](.*?)[。！？]', text)
        for term, definition in definitions:
            if len(definition.strip()) > 5:
                knowledge_points.append(f"• {term.strip()}是{definition.strip()}")
        
        # 查找数字信息
        numbers = re.findall(r'(\d+(?:\.\d+)?)\s*([个只件条项名人次年月日])', text)
        if numbers:
            knowledge_points.append(f"• 数量信息：{', '.join([f'{num}{unit}' for num, unit in numbers[:3]])}")
        
        # 查找时间信息
        times = re.findall(r'(\d{4}年|\d{1,2}月|\d{1,2}日)', text)
        if times:
            knowledge_points.append(f"• 时间信息：{', '.join(times[:3])}")
        
        if not knowledge_points:
            knowledge_points.append("• 本文包含重要信息，建议仔细阅读。")
        
        return "\n".join(knowledge_points)
    
    def _combine_synthesized_content(self, synthesized_content: List[Dict]) -> str:
        """组合合成内容"""
        if not synthesized_content:
            return ""
        
        result_parts = []
        for item in synthesized_content:
            result_parts.append(f"=== {item['description']} ===")
            result_parts.append(item['content'])
            result_parts.append("")
        
        return "\n".join(result_parts)
    
    def _calculate_synthesis_quality_score(self, text: str) -> float:
        """计算合成质量分数"""
        if not text:
            return 0.0
        
        # 基于长度、结构和内容多样性计算分数
        length_score = min(30, len(text) / 200 * 30)
        structure_score = 35 if "===" in text else 20
        content_score = 35 if len(text) > 100 else 20
        
        return length_score + structure_score + content_score
    
    def _chinese_text_cleaning(self, text: str, config: Dict[str, Any]) -> str:
        """中文文本清理"""
        cleaned = self._clean_text(text)
        
        # 额外的清理选项
        if config.get('remove_english', False):
            cleaned = re.sub(r'[a-zA-Z]+', '', cleaned)
        
        if config.get('remove_numbers', False):
            cleaned = re.sub(r'\d+', '', cleaned)
        
        if config.get('normalize_punctuation', True):
            # 标准化标点符号
            cleaned = cleaned.replace('，', '，').replace('。', '。')
            cleaned = cleaned.replace('？', '？').replace('！', '！')
        
        return cleaned
    
    def _chinese_text_segmentation(self, text: str, config: Dict[str, Any]) -> str:
        """中文文本分词"""
        # 简单的分词实现
        sentences = re.split(r'[。！？]', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if config.get('segment_type') == 'sentence':
            return '\n'.join([f"{i+1}. {s}" for i, s in enumerate(sentences)])
        else:
            # 字符级分词
            return ' '.join(list(text.replace(' ', '')))
    
    def _chinese_information_extraction(self, text: str, config: Dict[str, Any]) -> str:
        """中文信息提取"""
        extracted_info = []
        
        # 提取人名
        names = re.findall(r'[A-Z][a-z]+|[王李张刘陈杨赵黄周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董萧程曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏锺汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段雷钱汤尹黎易常武乔贺赖龚文][一-龯]{1,2}', text)
        if names:
            extracted_info.append(f"人名：{', '.join(set(names))}")
        
        # 提取地名
        places = re.findall(r'[北京上海广州深圳天津重庆成都武汉西安南京杭州苏州][市区县]?|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*', text)
        if places:
            extracted_info.append(f"地名：{', '.join(set(places))}")
        
        # 提取数字信息
        numbers = re.findall(r'\d+(?:\.\d+)?', text)
        if numbers:
            extracted_info.append(f"数字：{', '.join(set(numbers))}")
        
        return '\n'.join(extracted_info) if extracted_info else "未提取到特定信息"
    
    def _chinese_text_formatting(self, text: str, config: Dict[str, Any]) -> str:
        """中文文本格式化"""
        formatted = self._clean_text(text)
        
        # 格式化选项
        if config.get('add_paragraphs', True):
            # 按句子分段
            sentences = re.split(r'[。！？]', formatted)
            sentences = [s.strip() for s in sentences if s.strip()]
            
            paragraphs = []
            current_paragraph = []
            
            for sentence in sentences:
                current_paragraph.append(sentence)
                if len(current_paragraph) >= config.get('sentences_per_paragraph', 3):
                    paragraphs.append('。'.join(current_paragraph) + '。')
                    current_paragraph = []
            
            if current_paragraph:
                paragraphs.append('。'.join(current_paragraph) + '。')
            
            formatted = '\n\n'.join(paragraphs)
        
        if config.get('add_title', True):
            # 添加标题
            title = formatted[:20] + "..." if len(formatted) > 20 else formatted
            formatted = f"# {title}\n\n{formatted}"
        
        return formatted
    
    def _create_filter_result(self, original_text: str, processed_text: str, status: str, 
                            message: str, filter_results: Dict, start_time: datetime, 
                            quality_score: float = 0.0) -> Dict[str, Any]:
        """创建过滤结果"""
        return {
            'original_text': original_text,
            'processed_text': processed_text,
            'status': status,
            'message': message,
            'quality_score': quality_score,
            'filter_results': filter_results,
            'processing_time': (datetime.now() - start_time).total_seconds(),
            'timestamp': datetime.now().isoformat()
        }
    
    def get_default_chinese_filter_config(self) -> Dict[str, Any]:
        """获取默认中文过滤配置"""
        return {
            'min_chars': 20,
            'min_sentences': 1,
            'max_sentences': 1000,
            'max_special_ratio': 0.3,
            'max_repetition_ratio': 0.3,
            'min_quality_score': 0.3
        }
    
    def get_default_chinese_synthesis_config(self) -> Dict[str, Any]:
        """获取默认中文合成配置"""
        return {
            'generate_qa': True,
            'generate_summary': True,
            'generate_knowledge': True
        }

# 创建服务实例
chinese_dataflow_service = ChineseDataFlowService() 