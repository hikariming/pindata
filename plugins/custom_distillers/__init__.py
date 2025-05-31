# plugins/custom_distillers/__init__.py
# 用于自定义蒸馏器插件

# 示例：自动注册逻辑 (类似 custom_parsers)
# from backend.app.plugins.registry import plugin_registry

# def register_custom_distillers():
#     import os
#     import importlib
#     current_dir = os.path.dirname(os.path.abspath(__file__))
#     for filename in os.listdir(current_dir):
#         if filename.endswith('.py') and filename != '__init__.py':
#             module_name = filename[:-3]
#             try:
#                 module = importlib.import_module(f'.{module_name}', package=__name__)
#                 if hasattr(module, 'distiller_class') and hasattr(module, 'distiller_name'):
#                     plugin_registry.register_distiller(module.distiller_name, module.distiller_class)
#                     print(f"Registered custom distiller: {module.distiller_name}")
#             except Exception as e:
#                 print(f"Error loading custom distiller from {filename}: {e}")

# register_custom_distillers()

print("Custom distillers package initialized (mock).") 