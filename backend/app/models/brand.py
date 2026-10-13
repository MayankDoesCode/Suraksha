import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from backend.app.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class Brand(Base):
    """Core Brand entity representing an organization monitored by SentinelShield."""
    __tablename__ = "brands"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    logo_url = Column(String(1024), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    # Structured relational brand assets with cascading deletion
    domains = relationship(
        "BrandDomain",
        back_populates="brand",
        cascade="all, delete-orphan",
        order_by="BrandDomain.is_primary.desc(), BrandDomain.domain.asc()"
    )
    social_handles = relationship(
        "BrandSocialHandle",
        back_populates="brand",
        cascade="all, delete-orphan",
        order_by="BrandSocialHandle.platform.asc()"
    )
    app_identifiers = relationship(
        "BrandAppIdentifier",
        back_populates="brand",
        cascade="all, delete-orphan",
        order_by="BrandAppIdentifier.platform.asc()"
    )
    publishers = relationship(
        "BrandPublisher",
        back_populates="brand",
        cascade="all, delete-orphan",
        order_by="BrandPublisher.publisher_name.asc()"
    )

    def to_dict(self, include_relations: bool = True) -> dict:
        data = {
            "id": self.id,
            "name": self.name,
            "description": self.description or "",
            "logo_url": self.logo_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_relations:
            data.update({
                "domains": [d.to_dict() for d in self.domains],
                "social_handles": [s.to_dict() for s in self.social_handles],
                "app_identifiers": [a.to_dict() for a in self.app_identifiers],
                "publishers": [p.to_dict() for p in self.publishers],
            })
        return data

    def __repr__(self):
        return f"<Brand id={self.id} name={self.name!r}>"


class BrandDomain(Base):
    """Verified official domains owned or operated by the brand."""
    __tablename__ = "brand_domains"

    id = Column(Integer, primary_key=True, autoincrement=True)
    brand_id = Column(String(36), ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True)
    domain = Column(String(255), nullable=False)
    is_primary = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    brand = relationship("Brand", back_populates="domains")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "domain": self.domain,
            "is_primary": bool(self.is_primary),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<BrandDomain id={self.id} domain={self.domain!r} primary={self.is_primary}>"


class BrandSocialHandle(Base):
    """Verified official social media handles belonging to the brand."""
    __tablename__ = "brand_social_handles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    brand_id = Column(String(36), ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(String(64), nullable=False)
    handle = Column(String(255), nullable=False)
    url = Column(String(1024), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    brand = relationship("Brand", back_populates="social_handles")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "platform": self.platform,
            "handle": self.handle,
            "url": self.url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<BrandSocialHandle id={self.id} platform={self.platform!r} handle={self.handle!r}>"


class BrandAppIdentifier(Base):
    """Official mobile application IDs or package signatures."""
    __tablename__ = "brand_app_identifiers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    brand_id = Column(String(36), ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True)
    platform = Column(String(64), nullable=False)  # e.g., 'android_play_store', 'ios_app_store'
    identifier = Column(String(255), nullable=False)  # e.g., 'com.sentinelshield.app'
    app_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    brand = relationship("Brand", back_populates="app_identifiers")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "platform": self.platform,
            "identifier": self.identifier,
            "app_name": self.app_name,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<BrandAppIdentifier id={self.id} platform={self.platform!r} identifier={self.identifier!r}>"


class BrandPublisher(Base):
    """Known publisher or developer accounts used by the brand in official stores."""
    __tablename__ = "brand_publishers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    brand_id = Column(String(36), ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True)
    publisher_name = Column(String(255), nullable=False)
    platform = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    brand = relationship("Brand", back_populates="publishers")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "publisher_name": self.publisher_name,
            "platform": self.platform,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<BrandPublisher id={self.id} publisher_name={self.publisher_name!r}>"
