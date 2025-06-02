from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, JSON, Index
from app.db import db
import enum
import uuid

class LogLevel(enum.Enum):
    """日志级别枚举"""
    DEBUG = "debug"
    INFO = "info"
    WARN = "warn" 
    ERROR = "error"

class SystemLog(db.Model):
    """系统日志模型"""
    __tablename__ = 'system_logs'
    
    id = Column(String(36), primary_key=True)  # UUID
    level = Column(Enum(LogLevel), nullable=False, index=True)  # 日志级别
    message = Column(Text, nullable=False)  # 日志消息
    source = Column(String(100), nullable=False, index=True)  # 日志来源
    details = Column(Text)  # 详细信息
    
    # 上下文信息
    module = Column(String(100))  # 模块名称
    function = Column(String(100))  # 函数名称
    line_number = Column(Integer)  # 行号
    
    # 请求相关信息
    request_id = Column(String(36))  # 请求ID
    user_id = Column(String(36))  # 用户ID
    ip_address = Column(String(45))  # IP地址
    
    # 额外数据
    extra_data = Column(JSON)  # 额外的结构化数据
    
    # 错误相关（仅错误日志使用）
    error_code = Column(String(50))  # 错误代码
    stack_trace = Column(Text)  # 堆栈跟踪
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # 为查询性能创建复合索引
    __table_args__ = (
        Index('idx_logs_level_created', 'level', 'created_at'),
        Index('idx_logs_source_created', 'source', 'created_at'),
        Index('idx_logs_request_id', 'request_id'),
    )
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            'id': self.id,
            'level': self.level.value if self.level else None,
            'message': self.message,
            'source': self.source,
            'details': self.details,
            'module': self.module,
            'function': self.function,
            'line_number': self.line_number,
            'request_id': self.request_id,
            'user_id': self.user_id,
            'ip_address': self.ip_address,
            'extra_data': self.extra_data,
            'error_code': self.error_code,
            'stack_trace': self.stack_trace,
            'timestamp': self.created_at.isoformat() if self.created_at else None
        }
    
    @classmethod
    def create_log(cls, level, message, source, **kwargs):
        """创建日志记录的便捷方法"""
        log = cls(
            level=level,
            message=message,
            source=source,
            **kwargs
        )
        db.session.add(log)
        try:
            db.session.commit()
            return log
        except Exception as e:
            db.session.rollback()
            # 如果日志记录失败，至少打印到控制台
            print(f"Failed to save log: {e}")
            return None
    
    @classmethod
    def log_info(cls, message, source, **kwargs):
        """记录信息日志"""
        return cls.create_log(LogLevel.INFO, message, source, **kwargs)
    
    @classmethod
    def log_warning(cls, message, source, **kwargs):
        """记录警告日志"""
        return cls.create_log(LogLevel.WARN, message, source, **kwargs)
    
    @classmethod
    def log_error(cls, message, source, **kwargs):
        """记录错误日志"""
        return cls.create_log(LogLevel.ERROR, message, source, **kwargs)
    
    @classmethod
    def log_debug(cls, message, source, **kwargs):
        """记录调试日志"""
        return cls.create_log(LogLevel.DEBUG, message, source, **kwargs)
    
    @classmethod
    def cleanup_old_logs(cls, days=30):
        """清理旧日志记录"""
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        deleted_count = cls.query.filter(cls.created_at < cutoff_date).delete()
        db.session.commit()
        return deleted_count
    
    @classmethod
    def get_stats(cls, hours=24):
        """获取日志统计信息"""
        from datetime import timedelta
        from sqlalchemy import func
        
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        stats = db.session.query(
            cls.level,
            func.count(cls.id).label('count')
        ).filter(
            cls.created_at >= cutoff_time
        ).group_by(cls.level).all()
        
        result = {level.value: 0 for level in LogLevel}
        for level, count in stats:
            result[level.value] = count
            
        return result 