'''
数据集版本模型
'''

# 示例: SQLAlchemy 模型
# from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
# from sqlalchemy.orm import relationship
# from .dataset import Base # 假设 Base 在 dataset.py 中定义

# class Version(Base):
#     __tablename__ = 'versions'

#     id = Column(Integer, primary_key=True)
#     dataset_id = Column(Integer, ForeignKey('datasets.id'))
#     version_number = Column(String)
#     description = Column(String)
#     created_at = Column(DateTime)

#     dataset = relationship("Dataset", back_populates="versions") 