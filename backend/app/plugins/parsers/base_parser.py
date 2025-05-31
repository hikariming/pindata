from abc import ABC, abstractmethod

class BaseParser(ABC):
    @abstractmethod
    def parse(self, file_path, config=None):
        '''
        解析单个文件并返回文本块列表。
        :param file_path: 要解析的文件的路径。
        :param config: 解析器的特定配置。
        :return: 文本块列表 (list of strings)。
        '''
        pass

    def parse_bulk(self, file_paths, config=None):
        '''
        批量解析多个文件。
        :param file_paths: 文件路径列表。
        :param config: 解析器的特定配置。
        :return: 一个字典，键是文件名，值是对应的文本块列表。
        '''
        results = {}
        for file_path in file_paths:
            try:
                results[file_path] = self.parse(file_path, config)
            except Exception as e:
                print(f"Error parsing file {file_path}: {e}")
                results[file_path] = [] # 或者抛出异常，或者记录错误
        return results

    def get_config_schema(self):
        '''
        返回此解析器的配置参数描述（可选）。
        用于在UI中动态生成配置表单。
        返回一个JSON Schema格式的字典。
        '''
        return {} 