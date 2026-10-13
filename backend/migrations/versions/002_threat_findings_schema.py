"""Threat Findings, Detection Signals, and Evidence Schema

Revision ID: 002_threat_findings_schema
Revises: 001_initial_schema
Create Date: 2026-10-13 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "002_threat_findings_schema"
down_revision = "001_initial_schema"
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Findings table
    op.create_table(
        "findings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("brand_id", sa.String(36), sa.ForeignKey("brands.id", ondelete="CASCADE"), nullable=False),
        sa.Column("asset_type", sa.String(64), nullable=False),
        sa.Column("candidate_name", sa.String(255), nullable=False),
        sa.Column("source_url", sa.String(1024), nullable=True),
        sa.Column("risk_score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("severity", sa.String(32), nullable=False, server_default="LOW"),
        sa.Column("review_status", sa.String(32), nullable=False, server_default="NEW"),
        sa.Column("detection_source", sa.String(128), nullable=False, server_default="similarity_engine"),
        sa.Column("is_sample", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_findings_brand_id", "findings", ["brand_id"])
    op.create_index("ix_findings_asset_type", "findings", ["asset_type"])
    op.create_index("ix_findings_severity", "findings", ["severity"])
    op.create_index("ix_findings_review_status", "findings", ["review_status"])

    # 2. Detection Signals table
    op.create_table(
        "detection_signals",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("finding_id", sa.String(36), sa.ForeignKey("findings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("signal_type", sa.String(64), nullable=False),
        sa.Column("score", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column("metadata_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_detection_signals_finding_id", "detection_signals", ["finding_id"])
    op.create_index("ix_detection_signals_signal_type", "detection_signals", ["signal_type"])

    # 3. Evidence Records table
    op.create_table(
        "evidence_records",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("finding_id", sa.String(36), sa.ForeignKey("findings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("evidence_type", sa.String(64), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("source_reference", sa.String(1024), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_evidence_records_finding_id", "evidence_records", ["finding_id"])


def downgrade() -> None:
    op.drop_table("evidence_records")
    op.drop_table("detection_signals")
    op.drop_table("findings")
