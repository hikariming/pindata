"""add_dataflow_task_types_to_enum

Revision ID: 9d5aba691653
Revises: 851830d12fef
Create Date: 2025-07-06 23:23:40.171051

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d5aba691653'
down_revision: Union[str, None] = '851830d12fef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 添加新的 DataFlow 任务类型到 tasktype 枚举
    op.execute("ALTER TYPE tasktype ADD VALUE 'PRETRAIN_FILTER'")
    op.execute("ALTER TYPE tasktype ADD VALUE 'PRETRAIN_SYNTHETIC'")
    op.execute("ALTER TYPE tasktype ADD VALUE 'SFT_FILTER'")
    op.execute("ALTER TYPE tasktype ADD VALUE 'SFT_SYNTHETIC'")


def downgrade() -> None:
    # 注意：PostgreSQL 不支持直接从枚举中删除值
    # 如果需要回滚，需要重新创建枚举类型
    pass
