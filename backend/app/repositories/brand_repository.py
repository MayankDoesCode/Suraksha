from typing import Optional, List, Tuple
from sqlalchemy import or_, func
from sqlalchemy.orm import selectinload, Session
from backend.app.database import get_db
from backend.app.models.brand import (
    Brand,
    BrandDomain,
    BrandSocialHandle,
    BrandAppIdentifier,
    BrandPublisher
)

class BrandRepository:
    """Repository handling database operations for Brand and related assets."""

    def __init__(self, db_session: Optional[Session] = None):
        self._session = db_session

    @property
    def session(self) -> Session:
        return self._session if self._session is not None else get_db()

    def get_all(
        self,
        search: Optional[str] = None,
        owner_id: Optional[str] = None,
        is_sample: Optional[bool] = None,
        offset: int = 0,
        limit: int = 50
    ) -> Tuple[List[Brand], int]:
        """List brands with optional owner_id, is_sample, and search filtering and pagination."""
        query = self.session.query(Brand).options(
            selectinload(Brand.domains),
            selectinload(Brand.social_handles),
            selectinload(Brand.app_identifiers),
            selectinload(Brand.publishers),
        )

        if owner_id is not None:
            query = query.filter(Brand.owner_id == owner_id)

        if is_sample is not None:
            query = query.filter(Brand.is_sample == is_sample)

        if search:
            search_term = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Brand.name).like(search_term),
                    func.lower(Brand.description).like(search_term)
                )
            )

        total_count = query.count()
        brands = (
            query.order_by(Brand.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return brands, total_count

    def get_by_id(self, brand_id: str) -> Optional[Brand]:
        """Retrieve a brand by its unique identifier."""
        return (
            self.session.query(Brand)
            .options(
                selectinload(Brand.domains),
                selectinload(Brand.social_handles),
                selectinload(Brand.app_identifiers),
                selectinload(Brand.publishers),
            )
            .filter(Brand.id == brand_id)
            .first()
        )

    def get_by_name(self, name: str) -> Optional[Brand]:
        """Retrieve a brand by its exact name (case-insensitive)."""
        return (
            self.session.query(Brand)
            .filter(func.lower(Brand.name) == name.strip().lower())
            .first()
        )

    def create(self, brand: Brand) -> Brand:
        """Persist a new brand with attached relational assets."""
        self.session.add(brand)
        self.session.commit()
        self.session.refresh(brand)
        return brand

    def update(self, brand: Brand) -> Brand:
        """Persist changes to an existing brand."""
        self.session.commit()
        self.session.refresh(brand)
        return brand

    def delete(self, brand: Brand) -> None:
        """Remove a brand from the database (cascading deletes will clean children)."""
        self.session.delete(brand)
        self.session.commit()
