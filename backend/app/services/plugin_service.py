'''
插件服务
'''

class PluginService:
    def __init__(self, plugin_registry):
        self.plugin_registry = plugin_registry

    def list_available_plugins(self, plugin_type=None):
        # 列出所有或特定类型的可用插件
        # return self.plugin_registry.list_plugins(plugin_type)
        pass

    def get_plugin_details(self, plugin_name):
        # 获取插件的详细信息（例如配置参数）
        # plugin = self.plugin_registry.get_plugin(plugin_name)
        # return plugin.get_config_schema() if plugin else None
        pass

    # 其他插件管理相关的业务逻辑... 