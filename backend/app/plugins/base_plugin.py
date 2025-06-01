"""插件基类定义"""
from abc import ABC, abstractmethod
from typing import Any, Dict

class BasePlugin(ABC):
    """所有插件的基类"""
    
    def __init__(self, config: Dict[str, Any] = None):
        """初始化插件
        
        Args:
            config: 插件配置参数
        """
        self.config = config or {}
    
    @abstractmethod
    def process(self, data: Any) -> Any:
        """处理数据的抽象方法
        
        Args:
            data: 输入数据
            
        Returns:
            处理后的数据
        """
        pass
    
    def validate_config(self) -> bool:
        """验证配置是否有效
        
        Returns:
            配置是否有效
        """
        return True 