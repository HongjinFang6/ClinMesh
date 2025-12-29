"""Add before/after demo images to Model

Revision ID: 005
Revises: 004
Create Date: 2024-12-28 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005'
down_revision: Union[str, None] = '004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add before_image_path and after_image_path columns to models table
    op.add_column('models', sa.Column('before_image_path', sa.String(length=500), nullable=True))
    op.add_column('models', sa.Column('after_image_path', sa.String(length=500), nullable=True))


def downgrade() -> None:
    # Remove before_image_path and after_image_path columns from models table
    op.drop_column('models', 'after_image_path')
    op.drop_column('models', 'before_image_path')
