'''
插件注册中心
'''

class PluginRegistry:
    def __init__(self):
        self._parsers = {}
        self._cleaners = {}
        self._distillers = {}

    def register_parser(self, name, parser_class):
        if name in self._parsers:
            print(f"Warning: Parser '{name}' already registered. Overwriting.")
        self._parsers[name] = parser_class

    def register_cleaner(self, name, cleaner_class):
        if name in self._cleaners:
            print(f"Warning: Cleaner '{name}' already registered. Overwriting.")
        self._cleaners[name] = cleaner_class

    def register_distiller(self, name, distiller_class):
        if name in self._distillers:
            print(f"Warning: Distiller '{name}' already registered. Overwriting.")
        self._distillers[name] = distiller_class

    def get_parser(self, name):
        return self._parsers.get(name)

    def get_cleaner(self, name):
        return self._cleaners.get(name)

    def get_distiller(self, name):
        return self._distillers.get(name)

    def list_parsers(self):
        return list(self._parsers.keys())

    def list_cleaners(self):
        return list(self._cleaners.keys())

    def list_distillers(self):
        return list(self._distillers.keys())

    def get_plugin(self, name):
        if name in self._parsers: return self.get_parser(name)
        if name in self._cleaners: return self.get_cleaner(name)
        if name in self._distillers: return self.get_distiller(name)
        return None

    def list_plugins(self, plugin_type=None):
        if plugin_type == 'parser':
            return self.list_parsers()
        elif plugin_type == 'cleaner':
            return self.list_cleaners()
        elif plugin_type == 'distiller':
            return self.list_distillers()
        else:
            return self.list_parsers() + self.list_cleaners() + self.list_distillers() 