"""Add imaging modality and organ tags to Model

Revision ID: 006
Revises: 005
Create Date: 2026-01-11 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '006'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add imaging_modality_tags and organ_tags array columns to models table
    op.add_column('models', sa.Column('imaging_modality_tags', postgresql.ARRAY(sa.String()), server_default='{}', nullable=False))
    op.add_column('models', sa.Column('organ_tags', postgresql.ARRAY(sa.String()), server_default='{}', nullable=False))


def downgrade() -> None:
    # Remove imaging_modality_tags and organ_tags columns from models table
    op.drop_column('models', 'organ_tags')
    op.drop_column('models', 'imaging_modality_tags')
