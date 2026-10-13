"""Initial Brand and Relational Assets Schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-13 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Brands table
    op.create_table(
        "brands",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.String(1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_brands_name", "brands", ["name"])

    # 2. Brand Domains table
    op.create_table(
        "brand_domains",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("brand_id", sa.String(36), sa.ForeignKey("brands.id", ondelete="CASCADE"), nullable=False),
        sa.Column("domain", sa.String(255), nullable=False),
        sa.Column("is_primary", sa.Boolean(), default=False, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_brand_domains_brand_id", "brand_domains", ["brand_id"])

    # 3. Brand Social Handles table
    op.create_table(
        "brand_social_handles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("brand_id", sa.String(36), sa.ForeignKey("brands.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(64), nullable=False),
        sa.Column("handle", sa.String(255), nullable=False),
        sa.Column("url", sa.String(1024), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_brand_social_handles_brand_id", "brand_social_handles", ["brand_id"])

    # 4. Brand App Identifiers table
    op.create_table(
        "brand_app_identifiers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("brand_id", sa.String(36), sa.ForeignKey("brands.id", ondelete="CASCADE"), nullable=False),
        sa.Column("platform", sa.String(64), nullable=False),
        sa.Column("identifier", sa.String(255), nullable=False),
        sa.Column("app_name", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_brand_app_identifiers_brand_id", "brand_app_identifiers", ["brand_id"])

    # 5. Brand Publishers table
    op.create_table(
        "brand_publishers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("brand_id", sa.String(36), sa.ForeignKey("brands.id", ondelete="CASCADE"), nullable=False),
        sa.Column("publisher_name", sa.String(255), nullable=False),
        sa.Column("platform", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_brand_publishers_brand_id", "brand_publishers", ["brand_id"])


def downgrade() -> None:
    op.drop_table("brand_publishers")
    op.drop_table("brand_app_identifiers")
    op.drop_table("brand_social_handles")
    op.drop_table("brand_domains")
    op.drop_table("brands")
