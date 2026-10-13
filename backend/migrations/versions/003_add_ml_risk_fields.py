"""Add ML risk classification columns to findings table

Revision ID: 003_add_ml_risk_fields
Revises: 002_threat_findings_schema
Create Date: 2026-10-13 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "003_add_ml_risk_fields"
down_revision = "002_threat_findings_schema"
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Adding nullable ML fields for backward compatibility with existing SQLite and PostgreSQL tables
    with op.batch_alter_table("findings", schema=None) as batch_op:
        batch_op.add_column(sa.Column("rule_based_score", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("ml_risk_score", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("ml_predicted_class", sa.String(32), nullable=True))
        batch_op.add_column(sa.Column("ml_confidence", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("ml_model_version", sa.String(64), nullable=True))
        batch_op.add_column(sa.Column("final_risk_score", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("ml_fallback_used", sa.Boolean(), nullable=True, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table("findings", schema=None) as batch_op:
        batch_op.drop_column("ml_fallback_used")
        batch_op.drop_column("final_risk_score")
        batch_op.drop_column("ml_model_version")
        batch_op.drop_column("ml_confidence")
        batch_op.drop_column("ml_predicted_class")
        batch_op.drop_column("ml_risk_score")
        batch_op.drop_column("rule_based_score")
