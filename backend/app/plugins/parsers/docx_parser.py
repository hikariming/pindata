from .base_parser import BaseParser
# import docx # 需要 python-docx 库

class DocxParser(BaseParser):
    def parse(self, file_path, config=None):
        '''解析 DOCX 文件'''
        text_blocks = []
        try:
            # doc = docx.Document(file_path)
            # for para in doc.paragraphs:
            #     if para.text.strip(): # 忽略空段落
            #         text_blocks.append(para.text.strip())
            # 模拟解析
            text_blocks.append(f"Text from DOCX file: {file_path} (mock)")
        except Exception as e:
            print(f"Error parsing DOCX file {file_path}: {e}")
            # 可以选择抛出异常或返回空列表
            raise
        return text_blocks

    def get_config_schema(self):
        return {
            "type": "object",
            "properties": {
                "example_param": {
                    "type": "string",
                    "title": "Example DOCX Parameter",
                    "description": "An example configuration parameter for DOCX parser."
                }
            }
        } 