'''
数据集模型
'''

# 示例: SQLAlchemy 模型
# from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
# from sqlalchemy.orm import relationship
# from sqlalchemy.ext.declarative import declarative_base

# Base = declarative_base()

# class Dataset(Base):
#     __tablename__ = 'datasets'

#     id = Column(Integer, primary_key=True)
#     name = Column(String)
#     description = Column(String)
#     created_at = Column(DateTime)
#     updated_at = Column(DateTime)

#     versions = relationship("Version", back_populates="dataset") 