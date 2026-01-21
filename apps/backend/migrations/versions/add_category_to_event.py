"""Add category field to Event model

Revision ID: b7e3c4f5a123
Revises: 06751e050f5c
Create Date: 2026-01-20

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b7e3c4f5a123'
down_revision = '06751e050f5c'
branch_labels = None
depends_on = None


def upgrade():
    # Add category column with default value 'other'
    op.add_column('event', sa.Column('category', sa.String(50), nullable=True, server_default='other'))

    # Update existing events to have 'other' category
    op.execute("UPDATE event SET category = 'other' WHERE category IS NULL")


def downgrade():
    op.drop_column('event', 'category')
