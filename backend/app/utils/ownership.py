"""
Single definition of "may this caller act on this brand or finding?".

Rule: sample records are public demo data. A real record is available only to its owner or to an admin. A real record with
no resolvable owner (owner_id NULL or blank, or a finding whose brand no longer exists) is admin-only: "nobody owns it"
must never mean "everybody may use it". The previous inline checks were `if owner_id and owner_id != caller`, which
silently skipped the check whenever owner_id was empty.
"""
from typing import Any, Optional


def _owner(brand: Any) -> str:
    return (getattr(brand, "owner_id", None) or "").strip()


def can_access_brand(brand: Any, user: Optional[dict]) -> bool:
    if brand is None:
        return False
    if getattr(brand, "is_sample", False):
        return True
    if not user:
        return False
    if user.get("role") == "admin":
        return True
    owner = _owner(brand)
    return bool(owner) and owner == (user.get("uid") or "")


def can_access_finding(finding: Any, user: Optional[dict]) -> bool:
    if getattr(finding, "is_sample", False):
        return True
    if user and user.get("role") == "admin":
        return True  # admins may also see findings whose brand row is gone
    return can_access_brand(getattr(finding, "brand", None), user)
