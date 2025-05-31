'''
插件系统初始化和注册
'''

# from .registry import PluginRegistry

# def register_core_plugins(registry: PluginRegistry):
#     # 示例：注册核心解析器
#     from .parsers.docx_parser import DocxParser
#     registry.register_parser('core_docx_parser', DocxParser)

#     from .parsers.pptx_parser import PptxParser
#     registry.register_parser('core_pptx_parser', PptxParser)
    
#     # 示例：注册核心蒸馏器
#     from .distillers.text_chunker import TextChunker
#     registry.register_distiller('core_text_chunker', TextChunker)

#     from .distillers.alpaca_distiller import AlpacaDistiller
#     registry.register_distiller('core_alpaca_distiller', AlpacaDistiller)
    
    # 其他核心插件...

# def load_custom_plugins(registry: PluginRegistry):
#     # 动态加载自定义插件的逻辑
#     # 例如，扫描 `plugins/custom_parsers` 和 `plugins/custom_distillers` 目录
#     pass

# plugin_registry = PluginRegistry()
# register_core_plugins(plugin_registry)
# load_custom_plugins(plugin_registry) # 可选，如果支持运行时加载 