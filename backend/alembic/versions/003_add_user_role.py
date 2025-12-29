"""Add role field to User model

Revision ID: 003
Revises: 002
Create Date: 2024-12-28 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum type for user roles
    role_enum = sa.Enum('DEVELOPER', 'DOCTOR', name='userrole')
    role_enum.create(op.get_bind(), checkfirst=True)

    # Add role column to users table with default value
    op.add_column('users', sa.Column('role', role_enum, nullable=False, server_default='DOCTOR'))


def downgrade() -> None:
    # Remove role column from users table
    op.drop_column('users', 'role')

    # Drop the enum type
    sa.Enum(name='userrole').drop(op.get_bind(), checkfirst=True)
