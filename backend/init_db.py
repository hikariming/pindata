"""数据库初始化脚本"""
from app import create_app
from app.db import db
from app.models import Plugin, PluginType

def init_database():
    """初始化数据库并添加内置插件"""
    app = create_app('development')
    
    with app.app_context():
        # 创建所有表
        db.create_all()
        
        # 添加内置插件
        builtin_plugins = [
            {
                'name': 'docx_parser',
                'display_name': 'Word文档解析器',
                'type': PluginType.PARSER,
                'description': '解析Microsoft Word文档（.docx）格式',
                'version': '1.0.0',
                'author': 'System',
                'is_builtin': True,
                'config_schema': {}
            },
            {
                'name': 'pptx_parser',
                'display_name': 'PPT文档解析器',
                'type': PluginType.PARSER,
                'description': '解析Microsoft PowerPoint文档（.pptx）格式',
                'version': '1.0.0',
                'author': 'System',
                'is_builtin': True,
                'config_schema': {}
            },
            {
                'name': 'pdf_parser',
                'display_name': 'PDF文档解析器',
                'type': PluginType.PARSER,
                'description': '解析PDF文档格式',
                'version': '1.0.0',
                'author': 'System',
                'is_builtin': True,
                'config_schema': {}
            },
            {
                'name': 'basic_cleaner',
                'display_name': '基础文本清洗器',
                'type': PluginType.CLEANER,
                'description': '基础的文本清洗功能，包括去除多余空格、特殊字符等',
                'version': '1.0.0',
                'author': 'System',
                'is_builtin': True,
                'config_schema': {
                    'remove_extra_spaces': {'type': 'boolean', 'default': True},
                    'remove_special_chars': {'type': 'boolean', 'default': False}
                }
            },
            {
                'name': 'text_block_distiller',
                'display_name': '纯文本块蒸馏器',
                'type': PluginType.DISTILLER,
                'description': '将文本转换为纯文本块格式',
                'version': '1.0.0',
                'author': 'System',
                'is_builtin': True,
                'config_schema': {
                    'block_size': {'type': 'integer', 'default': 512}
                }
            },
            {
                'name': 'alpaca_distiller',
                'display_name': 'Alpaca格式蒸馏器',
                'type': PluginType.DISTILLER,
                'description': '将文本转换为Alpaca对话格式',
                'version': '1.0.0',
                'author': 'System',
                'is_builtin': True,
                'config_schema': {}
            }
        ]
        
        # 检查并添加插件
        for plugin_data in builtin_plugins:
            existing = Plugin.query.filter_by(name=plugin_data['name']).first()
            if not existing:
                plugin = Plugin(**plugin_data)
                db.session.add(plugin)
        
        db.session.commit()
        print("数据库初始化完成！")

if __name__ == '__main__':
    init_database() 