from .base_distiller import BaseDistiller

class TextChunker(BaseDistiller):
    def distill(self, text_blocks, config=None):
        '''将长文本块分割成较小的、固定大小的纯文本块'''
        chunk_size = config.get('chunk_size', 1000) if config else 1000
        overlap = config.get('overlap', 200) if config else 200
        
        all_text = "\n".join(text_blocks)
        chunks = []
        start = 0
        while start < len(all_text):
            end = start + chunk_size
            chunks.append(all_text[start:end])
            start += (chunk_size - overlap)
            if start + overlap >= len(all_text): # 确保不会因为 overlap 跳过末尾的小块
                if end < len(all_text):
                     chunks.append(all_text[end:]) # 添加最后剩余的部分
                break
        # 模拟输出
        # return [f"Chunk {i+1} (mock)" for i, _ in enumerate(chunks)] or ["No text to chunk (mock)"]
        return chunks or ["No text to chunk (mock)"]

    def get_config_schema(self):
        return {
            "type": "object",
            "properties": {
                "chunk_size": {
                    "type": "integer",
                    "title": "Chunk Size",
                    "description": "The maximum number of characters per chunk.",
                    "default": 1000
                },
                "overlap": {
                    "type": "integer",
                    "title": "Overlap Size",
                    "description": "The number of characters to overlap between chunks.",
                    "default": 200
                }
            },
            "required": ["chunk_size", "overlap"]
        } 