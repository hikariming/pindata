from abc import ABC, abstractmethod

class BaseDistiller(ABC):
    @abstractmethod
    def distill(self, text_blocks, config=None):
        '''
        将文本块列表蒸馏成特定格式的数据。
        :param text_blocks: 文本块列表 (list of strings)。
        :param config: 蒸馏器的特定配置。
        :return: 蒸馏后的数据（格式取决于具体蒸馏器，例如 list of dicts for Alpaca）。
        '''
        pass

    def get_config_schema(self):
        '''
        返回此蒸馏器的配置参数描述（可选）。
        '''
        return {}
