"""Add model_favorites table

Revision ID: 004
Revises: 003
Create Date: 2024-12-28 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = '004'
down_revision: Union[str, None] = '003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create model_favorites table
    op.create_table(
        'model_favorites',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('model_id', UUID(as_uuid=True), sa.ForeignKey('models.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )

    # Create unique constraint to prevent duplicate favorites
    op.create_unique_constraint('uq_user_model_favorite', 'model_favorites', ['user_id', 'model_id'])

    # Create indexes for faster lookups
    op.create_index('ix_model_favorites_user_id', 'model_favorites', ['user_id'])
    op.create_index('ix_model_favorites_model_id', 'model_favorites', ['model_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_model_favorites_model_id', 'model_favorites')
    op.drop_index('ix_model_favorites_user_id', 'model_favorites')

    # Drop unique constraint
    op.drop_constraint('uq_user_model_favorite', 'model_favorites', type_='unique')

    # Drop table
    op.drop_table('model_favorites')
