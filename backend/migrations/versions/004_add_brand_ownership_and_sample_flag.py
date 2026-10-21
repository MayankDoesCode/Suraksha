"""Add brand ownership, organization, and sample isolation columns to brands table

Revision ID: 004_brand_ownership_sample_flag
Revises: 003_add_ml_risk_fields
Create Date: 2026-10-14 07:10:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "004_brand_ownership_sample_flag"
down_revision = "003_add_ml_risk_fields"
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Adding nullable ownership and sample isolation fields with batch_alter_table for SQLite compatibility
    with op.batch_alter_table("brands", schema=None) as batch_op:
        batch_op.add_column(sa.Column("owner_id", sa.String(128), nullable=True, index=True))
        batch_op.add_column(sa.Column("organization_id", sa.String(128), nullable=True, index=True))
        batch_op.add_column(sa.Column("is_sample", sa.Boolean(), nullable=False, server_default=sa.false(), index=True))

    # Mark pre-existing synthetic/sample records as is_sample=True if owner_id is NULL
    op.execute(
        sa.text("UPDATE brands SET is_sample = :is_sample WHERE owner_id IS NULL AND name IN ('Acme FinTech', 'Microsoft Verification Test', 'ApexPay Global')").bindparams(is_sample=True)
    )


def downgrade() -> None:
    with op.batch_alter_table("brands", schema=None) as batch_op:
        batch_op.drop_column("is_sample")
        batch_op.drop_column("organization_id")
        batch_op.drop_column("owner_id")
