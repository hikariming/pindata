from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from app.db import db

class RawData(db.Model):
    """原始数据模型"""
    __tablename__ = 'raw_data'
    
    id = Column(Integer, primary_key=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(BigInteger)  # 文件大小（字节）
    minio_object_name = Column(String(500), nullable=False)  # MinIO中的对象名
    dataset_id = Column(Integer, ForeignKey('datasets.id'))
    upload_at = Column(DateTime, default=datetime.utcnow)
    
    # 关系
    dataset = relationship('Dataset')
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'file_type': self.file_type,
            'file_size': self.file_size,
            'minio_object_name': self.minio_object_name,
            'dataset_id': self.dataset_id,
            'upload_at': self.upload_at.isoformat() if self.upload_at else None
        } 