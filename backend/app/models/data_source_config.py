from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Enum as SQLEnum, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db import db
import enum
import uuid

class DataSourceType(enum.Enum):
    """数据源类型枚举"""
    DATABASE_TABLE = "database_table"
    API_SOURCE = "api_source"
    
class DatabaseType(enum.Enum):
    """数据库类型枚举"""
    MYSQL = "mysql"
    POSTGRESQL = "postgresql"
    SQLITE = "sqlite"
    ORACLE = "oracle"
    SQL_SERVER = "sql_server"
    MONGODB = "mongodb"
    REDIS = "redis"
    ELASTICSEARCH = "elasticsearch"

class APIAuthType(enum.Enum):
    """API认证类型枚举"""
    NONE = "none"
    BASIC = "basic"
    BEARER = "bearer"
    API_KEY = "api_key"
    OAUTH2 = "oauth2"
    CUSTOM = "custom"

class DataSourceStatus(enum.Enum):
    """数据源状态枚举"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    TESTING = "testing"

class DataSourceConfig(db.Model):
    """数据源配置模型 - 用于数据库表和API数据源"""
    __tablename__ = 'data_source_configs'
    
    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    source_type = Column(SQLEnum(DataSourceType), nullable=False)
    status = Column(SQLEnum(DataSourceStatus), default=DataSourceStatus.INACTIVE)
    
    # 项目关联
    project_id = Column(String(36), ForeignKey('data_governance_projects.id'))
    
    # 数据库配置（仅当source_type为DATABASE_TABLE时使用）
    database_type = Column(SQLEnum(DatabaseType))
    host = Column(String(255))
    port = Column(Integer)
    database_name = Column(String(255))
    username = Column(String(255))
    password_encrypted = Column(Text)  # 加密存储的密码
    schema_name = Column(String(255))
    table_name = Column(String(255))
    query = Column(Text)  # 自定义查询SQL
    connection_params = Column(JSON)  # 额外连接参数
    
    # API配置（仅当source_type为API_SOURCE时使用）
    api_url = Column(Text)
    api_method = Column(String(10), default="GET")  # GET, POST, PUT, DELETE
    auth_type = Column(SQLEnum(APIAuthType), default=APIAuthType.NONE)
    auth_config = Column(JSON)  # 认证配置信息
    headers = Column(JSON)  # 请求头
    query_params = Column(JSON)  # 查询参数
    request_body = Column(Text)  # 请求体（JSON格式）
    response_path = Column(String(500))  # 响应数据路径，例如 "data.items"
    pagination_config = Column(JSON)  # 分页配置
    
    # 数据处理配置
    data_format = Column(String(50))  # json, xml, csv, etc.
    mapping_config = Column(JSON)  # 字段映射配置
    filter_config = Column(JSON)  # 数据过滤配置
    transform_config = Column(JSON)  # 数据转换配置
    
    # 同步配置
    sync_enabled = Column(Boolean, default=False)
    sync_frequency = Column(String(50))  # manual, hourly, daily, weekly, monthly
    last_sync_at = Column(DateTime)
    next_sync_at = Column(DateTime)
    sync_timeout = Column(Integer, default=300)  # 同步超时时间（秒）
    
    # 数据统计
    total_records = Column(Integer, default=0)
    last_record_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    
    # 错误信息和日志
    last_error = Column(Text)
    connection_test_result = Column(JSON)  # 连接测试结果
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = Column(String(36))
    updated_by = Column(String(36))
    
    # 关系
    raw_data_items = relationship('RawData', foreign_keys='RawData.data_source_config_id', cascade='all, delete-orphan', overlaps="data_source_config")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = str(uuid.uuid4())
    
    @property
    def is_database_source(self):
        """判断是否为数据库数据源"""
        return self.source_type == DataSourceType.DATABASE_TABLE
    
    @property
    def is_api_source(self):
        """判断是否为API数据源"""
        return self.source_type == DataSourceType.API_SOURCE
    
    @property
    def connection_string(self):
        """生成数据库连接字符串（不包含密码）"""
        if not self.is_database_source:
            return None
        
        if self.database_type == DatabaseType.MYSQL:
            return f"mysql://{self.username}@{self.host}:{self.port}/{self.database_name}"
        elif self.database_type == DatabaseType.POSTGRESQL:
            return f"postgresql://{self.username}@{self.host}:{self.port}/{self.database_name}"
        elif self.database_type == DatabaseType.SQLITE:
            return f"sqlite:///{self.database_name}"
        else:
            return f"{self.database_type.value}://{self.username}@{self.host}:{self.port}/{self.database_name}"
    
    def get_masked_config(self):
        """获取脱敏后的配置信息"""
        config = self.to_dict()
        # 隐藏敏感信息
        if config.get('password_encrypted'):
            config['password_encrypted'] = '***'
        if config.get('auth_config'):
            # 隐藏认证配置中的敏感信息
            masked_auth = config['auth_config'].copy()
            for key in ['password', 'secret', 'token', 'api_key']:
                if key in masked_auth:
                    masked_auth[key] = '***'
            config['auth_config'] = masked_auth
        return config
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'source_type': self.source_type.value if self.source_type else None,
            'status': self.status.value if self.status else None,
            'project_id': self.project_id,
            
            # 数据库配置
            'database_type': self.database_type.value if self.database_type else None,
            'host': self.host,
            'port': self.port,
            'database_name': self.database_name,
            'username': self.username,
            'password_encrypted': self.password_encrypted,
            'schema_name': self.schema_name,
            'table_name': self.table_name,
            'query': self.query,
            'connection_params': self.connection_params,
            'connection_string': self.connection_string,
            
            # API配置
            'api_url': self.api_url,
            'api_method': self.api_method,
            'auth_type': self.auth_type.value if self.auth_type else None,
            'auth_config': self.auth_config,
            'headers': self.headers,
            'query_params': self.query_params,
            'request_body': self.request_body,
            'response_path': self.response_path,
            'pagination_config': self.pagination_config,
            
            # 数据处理配置
            'data_format': self.data_format,
            'mapping_config': self.mapping_config,
            'filter_config': self.filter_config,
            'transform_config': self.transform_config,
            
            # 同步配置
            'sync_enabled': self.sync_enabled,
            'sync_frequency': self.sync_frequency,
            'last_sync_at': self.last_sync_at.isoformat() if self.last_sync_at else None,
            'next_sync_at': self.next_sync_at.isoformat() if self.next_sync_at else None,
            'sync_timeout': self.sync_timeout,
            
            # 统计信息
            'total_records': self.total_records,
            'last_record_count': self.last_record_count,
            'success_count': self.success_count,
            'error_count': self.error_count,
            'last_error': self.last_error,
            'connection_test_result': self.connection_test_result,
            
            # 时间戳
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'updated_by': self.updated_by,
        }