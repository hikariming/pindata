'''
插件模型
'''

# 示例: SQLAlchemy 模型
# from sqlalchemy import Column, Integer, String, DateTime
# from .dataset import Base # 假设 Base 在 dataset.py 中定义

# class Plugin(Base):
#     __tablename__ = 'plugins'

#     id = Column(Integer, primary_key=True)
#     name = Column(String, unique=True)
#     type = Column(String) # e.g., 'parser', 'cleaner', 'distiller'
#     description = Column(String)
#     version = Column(String)
#     enabled = Column(Boolean, default=True) 