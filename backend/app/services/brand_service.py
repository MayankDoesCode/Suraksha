import logging
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime, timezone

from backend.app.models.brand import (
    Brand,
    BrandDomain,
    BrandSocialHandle,
    BrandAppIdentifier,
    BrandPublisher
)
from backend.app.repositories.brand_repository import BrandRepository
from backend.app.validation.brand_validator import BrandValidator
from backend.app.utils.errors import ValidationError, NotFoundError, ConflictError

logger = logging.getLogger(__name__)

class BrandService:
    """Business service orchestrating brand management and validation rules."""

    def __init__(self, repository: Optional[BrandRepository] = None):
        self.repository = repository or BrandRepository()

    def list_brands(
        self,
        search: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict[str, Any]:
        """Retrieve paginated brands with search support."""
        page = max(1, page)
        per_page = min(max(1, per_page), 100)
        offset = (page - 1) * per_page

        brands, total_count = self.repository.get_all(
            search=search,
            offset=offset,
            limit=per_page
        )

        return {
            "items": [b.to_dict() for b in brands],
            "pagination": {
                "total": total_count,
                "page": page,
                "per_page": per_page,
                "total_pages": (total_count + per_page - 1) // per_page if total_count > 0 else 1
            }
        }

    def get_brand(self, brand_id: str) -> Dict[str, Any]:
        """Retrieve a specific brand profile by ID."""
        brand = self.repository.get_by_id(brand_id)
        if not brand:
            raise NotFoundError(f"Brand profile with ID '{brand_id}' was not found.")
        return brand.to_dict()

    def create_brand(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and create a new brand profile."""
        cleaned_data, errors = BrandValidator.validate(payload, is_update=False)
        if errors:
            raise ValidationError("Brand validation failed", details=errors)

        # Duplicate name rule check
        existing = self.repository.get_by_name(cleaned_data["name"])
        if existing:
            raise ConflictError(
                f"A brand profile with the name '{cleaned_data['name']}' already exists.",
                details=[{"field": "name", "message": "Brand name must be unique"}]
            )

        # Build brand model
        brand = Brand(
            name=cleaned_data["name"],
            description=cleaned_data.get("description", ""),
            logo_url=cleaned_data.get("logo_url")
        )

        # Attach domains
        for d in cleaned_data.get("domains", []):
            brand.domains.append(
                BrandDomain(domain=d["domain"], is_primary=d.get("is_primary", False))
            )

        # Attach social handles
        for s in cleaned_data.get("social_handles", []):
            brand.social_handles.append(
                BrandSocialHandle(
                    platform=s["platform"],
                    handle=s["handle"],
                    url=s.get("url")
                )
            )

        # Attach app identifiers
        for a in cleaned_data.get("app_identifiers", []):
            brand.app_identifiers.append(
                BrandAppIdentifier(
                    platform=a["platform"],
                    identifier=a["identifier"],
                    app_name=a.get("app_name")
                )
            )

        # Attach publishers
        for p in cleaned_data.get("publishers", []):
            brand.publishers.append(
                BrandPublisher(
                    publisher_name=p["publisher_name"],
                    platform=p.get("platform")
                )
            )

        created = self.repository.create(brand)
        logger.info("Created brand profile: %s (ID: %s)", created.name, created.id)
        return created.to_dict()

    def update_brand(self, brand_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and update an existing brand profile."""
        brand = self.repository.get_by_id(brand_id)
        if not brand:
            raise NotFoundError(f"Brand profile with ID '{brand_id}' was not found.")

        cleaned_data, errors = BrandValidator.validate(payload, is_update=True)
        if errors:
            raise ValidationError("Brand validation failed", details=errors)

        # If name is being changed, check for conflicts
        if "name" in cleaned_data and cleaned_data["name"].lower() != brand.name.lower():
            existing = self.repository.get_by_name(cleaned_data["name"])
            if existing and existing.id != brand.id:
                raise ConflictError(
                    f"A brand profile with the name '{cleaned_data['name']}' already exists.",
                    details=[{"field": "name", "message": "Brand name must be unique"}]
                )
            brand.name = cleaned_data["name"]

        if "description" in cleaned_data:
            brand.description = cleaned_data["description"]

        if "logo_url" in cleaned_data:
            brand.logo_url = cleaned_data["logo_url"]

        # Synchronize domains if explicitly provided in update
        if "domains" in cleaned_data:
            brand.domains.clear()
            for d in cleaned_data["domains"]:
                brand.domains.append(
                    BrandDomain(domain=d["domain"], is_primary=d.get("is_primary", False))
                )

        # Synchronize social handles if provided
        if "social_handles" in cleaned_data:
            brand.social_handles.clear()
            for s in cleaned_data["social_handles"]:
                brand.social_handles.append(
                    BrandSocialHandle(
                        platform=s["platform"],
                        handle=s["handle"],
                        url=s.get("url")
                    )
                )

        # Synchronize app identifiers if provided
        if "app_identifiers" in cleaned_data:
            brand.app_identifiers.clear()
            for a in cleaned_data["app_identifiers"]:
                brand.app_identifiers.append(
                    BrandAppIdentifier(
                        platform=a["platform"],
                        identifier=a["identifier"],
                        app_name=a.get("app_name")
                    )
                )

        # Synchronize publishers if provided
        if "publishers" in cleaned_data:
            brand.publishers.clear()
            for p in cleaned_data["publishers"]:
                brand.publishers.append(
                    BrandPublisher(
                        publisher_name=p["publisher_name"],
                        platform=p.get("platform")
                    )
                )

        brand.updated_at = datetime.now(timezone.utc)
        updated = self.repository.update(brand)
        logger.info("Updated brand profile: %s (ID: %s)", updated.name, updated.id)
        return updated.to_dict()

    def delete_brand(self, brand_id: str) -> None:
        """Safely delete a brand profile and all cascading relational records."""
        brand = self.repository.get_by_id(brand_id)
        if not brand:
            raise NotFoundError(f"Brand profile with ID '{brand_id}' was not found.")

        brand_name = brand.name
        self.repository.delete(brand)
        logger.info("Deleted brand profile: %s (ID: %s)", brand_name, brand_id)
