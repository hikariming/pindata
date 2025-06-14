"""Create image annotations tables

Revision ID: 001
Revises: 
Create Date: 2024-01-01 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # 创建图片标注表
    op.create_table('image_annotations',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('file_id', sa.String(36), nullable=False),
        sa.Column('type', sa.Enum('QA', 'CAPTION', 'CLASSIFICATION', 'OBJECT_DETECTION', 'SEGMENTATION', 'KEYPOINT', 'OCR', 'CUSTOM', name='imageannotationtype'), nullable=False),
        sa.Column('source', sa.Enum('HUMAN', 'AI', 'DETECTION', 'IMPORTED', name='annotationsource'), nullable=False),
        sa.Column('content', sa.JSON(), nullable=False),
        sa.Column('region', sa.JSON(), nullable=True),
        sa.Column('coordinates', sa.JSON(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=True, default=0.0),
        sa.Column('quality_score', sa.Float(), nullable=True, default=0.0),
        sa.Column('is_verified', sa.Boolean(), nullable=True, default=False),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('tags', sa.JSON(), nullable=True),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('model_info', sa.JSON(), nullable=True),
        sa.Column('review_status', sa.String(50), nullable=True, default='pending'),
        sa.Column('reviewer_id', sa.String(36), nullable=True),
        sa.Column('review_comments', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True, default=sa.func.now()),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.Column('updated_by', sa.String(36), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    # 创建索引
    op.create_index('ix_image_annotations_file_id', 'image_annotations', ['file_id'])
    op.create_index('ix_image_annotations_type', 'image_annotations', ['type'])
    op.create_index('ix_image_annotations_source', 'image_annotations', ['source'])
    op.create_index('ix_image_annotations_category', 'image_annotations', ['category'])
    op.create_index('ix_image_annotations_review_status', 'image_annotations', ['review_status'])
    op.create_index('ix_image_annotations_created_at', 'image_annotations', ['created_at'])
    
    # 创建标注历史表
    op.create_table('annotation_history',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('annotation_id', sa.String(36), nullable=False),
        sa.Column('action', sa.String(20), nullable=False),
        sa.Column('changes', sa.JSON(), nullable=True),
        sa.Column('created_by', sa.String(36), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True, default=sa.func.now()),
        sa.ForeignKeyConstraint(['annotation_id'], ['image_annotations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_annotation_history_annotation_id', 'annotation_history', ['annotation_id'])
    op.create_index('ix_annotation_history_action', 'annotation_history', ['action'])
    op.create_index('ix_annotation_history_created_at', 'annotation_history', ['created_at'])
    
    # 创建标注模板表
    op.create_table('annotation_templates',
        sa.Column('id', sa.String(36), nullable=False),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('type', sa.Enum('QA', 'CAPTION', 'CLASSIFICATION', 'OBJECT_DETECTION', 'SEGMENTATION', 'KEYPOINT', 'OCR', 'CUSTOM', name='imageannotationtype'), nullable=False),
        sa.Column('config', sa.JSON(), nullable=False),
        sa.Column('labels', sa.JSON(), nullable=True),
        sa.Column('default_values', sa.JSON(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=True, default=0),
        sa.Column('created_at', sa.DateTime(), nullable=True, default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=True, default=sa.func.now()),
        sa.Column('created_by', sa.String(36), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    
    op.create_index('ix_annotation_templates_type', 'annotation_templates', ['type'])
    op.create_index('ix_annotation_templates_name', 'annotation_templates', ['name'])


def downgrade():
    # 删除索引
    op.drop_index('ix_annotation_templates_name')
    op.drop_index('ix_annotation_templates_type')
    op.drop_index('ix_annotation_history_created_at')
    op.drop_index('ix_annotation_history_action')
    op.drop_index('ix_annotation_history_annotation_id')
    op.drop_index('ix_image_annotations_created_at')
    op.drop_index('ix_image_annotations_review_status')
    op.drop_index('ix_image_annotations_category')
    op.drop_index('ix_image_annotations_source')
    op.drop_index('ix_image_annotations_type')
    op.drop_index('ix_image_annotations_file_id')
    
    # 删除表
    op.drop_table('annotation_templates')
    op.drop_table('annotation_history')
    op.drop_table('image_annotations')
    
    # 删除枚举类型
    op.execute('DROP TYPE IF EXISTS imageannotationtype')
    op.execute('DROP TYPE IF EXISTS annotationsource') 