"""创建LLM配置和系统日志表

Revision ID: llm_config_001
Revises: 
Create Date: 2024-03-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'llm_config_001'
down_revision = None
depends_on = None

def upgrade():
    # 创建 LLM 配置表
    op.create_table('llm_configs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('provider', sa.Enum('OPENAI', 'CLAUDE', 'GEMINI', 'CUSTOM', name='providertype'), nullable=False),
        sa.Column('model_name', sa.String(255), nullable=False),
        sa.Column('api_key', sa.Text(), nullable=False),
        sa.Column('base_url', sa.String(500)),
        sa.Column('temperature', sa.Float(), default=0.7),
        sa.Column('max_tokens', sa.Integer(), default=4096),
        sa.Column('supports_vision', sa.Boolean(), default=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_default', sa.Boolean(), default=False),
        sa.Column('custom_headers', sa.JSON()),
        sa.Column('provider_config', sa.JSON()),
        sa.Column('usage_count', sa.Integer(), default=0),
        sa.Column('total_tokens_used', sa.Integer(), default=0),
        sa.Column('last_used_at', sa.DateTime()),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), default=sa.func.now(), onupdate=sa.func.now())
    )
    
    # 创建索引
    op.create_index('idx_llm_configs_provider', 'llm_configs', ['provider'])
    op.create_index('idx_llm_configs_is_active', 'llm_configs', ['is_active'])
    op.create_index('idx_llm_configs_is_default', 'llm_configs', ['is_default'])
    op.create_index('idx_llm_configs_supports_vision', 'llm_configs', ['supports_vision'])
    
    # 创建系统日志表
    op.create_table('system_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('level', sa.Enum('DEBUG', 'INFO', 'WARN', 'ERROR', name='loglevel'), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('source', sa.String(100), nullable=False),
        sa.Column('details', sa.Text()),
        sa.Column('module', sa.String(100)),
        sa.Column('function', sa.String(100)),
        sa.Column('line_number', sa.Integer()),
        sa.Column('request_id', sa.String(36)),
        sa.Column('user_id', sa.String(36)),
        sa.Column('ip_address', sa.String(45)),
        sa.Column('extra_data', sa.JSON()),
        sa.Column('error_code', sa.String(50)),
        sa.Column('stack_trace', sa.Text()),
        sa.Column('created_at', sa.DateTime(), default=sa.func.now())
    )
    
    # 创建系统日志索引
    op.create_index('idx_logs_level', 'system_logs', ['level'])
    op.create_index('idx_logs_source', 'system_logs', ['source'])
    op.create_index('idx_logs_created_at', 'system_logs', ['created_at'])
    op.create_index('idx_logs_level_created', 'system_logs', ['level', 'created_at'])
    op.create_index('idx_logs_source_created', 'system_logs', ['source', 'created_at'])
    op.create_index('idx_logs_request_id', 'system_logs', ['request_id'])

def downgrade():
    # 删除索引
    op.drop_index('idx_logs_request_id', 'system_logs')
    op.drop_index('idx_logs_source_created', 'system_logs')
    op.drop_index('idx_logs_level_created', 'system_logs')
    op.drop_index('idx_logs_created_at', 'system_logs')
    op.drop_index('idx_logs_source', 'system_logs')
    op.drop_index('idx_logs_level', 'system_logs')
    
    op.drop_index('idx_llm_configs_supports_vision', 'llm_configs')
    op.drop_index('idx_llm_configs_is_default', 'llm_configs')
    op.drop_index('idx_llm_configs_is_active', 'llm_configs')
    op.drop_index('idx_llm_configs_provider', 'llm_configs')
    
    # 删除表
    op.drop_table('system_logs')
    op.drop_table('llm_configs')
    
    # 删除枚举类型
    op.execute('DROP TYPE IF EXISTS loglevel')
    op.execute('DROP TYPE IF EXISTS providertype') 