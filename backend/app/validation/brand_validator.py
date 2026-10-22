import re
from typing import Dict, Any, List, Tuple
from urllib.parse import urlparse

DOMAIN_REGEX = re.compile(
    r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$"
)

SAFE_URL_SCHEMES = {"http", "https"}

class BrandValidator:
    """Validates brand creation and update payloads."""

    @staticmethod
    def validate(data: Any, is_update: bool = False) -> Tuple[Dict[str, Any], List[Dict[str, str]]]:
        """
        Validates payload and returns (cleaned_data, errors_list).
        If errors_list is non-empty, validation failed.
        """
        errors = []
        cleaned = {}

        if not isinstance(data, dict):
            return {}, [{"field": "body", "message": "Request body must be a valid JSON object"}]

        # 1. Brand Name
        if "name" in data:
            name = str(data["name"]).strip() if data["name"] is not None else ""
            if not name:
                errors.append({"field": "name", "message": "Brand name is required and cannot be empty"})
            elif len(name) < 2:
                errors.append({"field": "name", "message": "Brand name must be at least 2 characters long"})
            elif len(name) > 255:
                errors.append({"field": "name", "message": "Brand name cannot exceed 255 characters"})
            else:
                cleaned["name"] = name
        elif not is_update:
            errors.append({"field": "name", "message": "Brand name is required"})

        # 2. Description
        if "description" in data:
            desc = str(data["description"]).strip() if data["description"] is not None else ""
            if len(desc) > 5000:
                errors.append({"field": "description", "message": "Description cannot exceed 5000 characters"})
            else:
                cleaned["description"] = desc

        # 3. Logo URL
        if "logo_url" in data and isinstance(data["logo_url"], str) and re.fullmatch(
            r"/api/v1/brands/[A-Za-z0-9_-]{1,64}/logo", data["logo_url"].strip()
        ):
            cleaned["logo_url"] = data["logo_url"].strip()  # uploaded official logo
        elif "logo_url" in data:
            logo = str(data["logo_url"]).strip() if data["logo_url"] is not None else ""
            if logo:
                if len(logo) > 1024:
                    errors.append({"field": "logo_url", "message": "Logo URL cannot exceed 1024 characters"})
                else:
                    parsed = urlparse(logo)
                    if parsed.scheme.lower() not in SAFE_URL_SCHEMES:
                        errors.append({
                            "field": "logo_url",
                            "message": "Logo URL must use a safe scheme (http:// or https://)"
                        })
                    elif not parsed.netloc:
                        errors.append({"field": "logo_url", "message": "Logo URL must include a valid host"})
                    else:
                        cleaned["logo_url"] = logo
            else:
                cleaned["logo_url"] = None

        # 4. Domains
        if "domains" in data:
            raw_domains = data["domains"]
            if not isinstance(raw_domains, list):
                errors.append({"field": "domains", "message": "Domains must be provided as a list"})
            else:
                cleaned_domains = []
                seen_domains = set()
                primary_count = 0

                for idx, item in enumerate(raw_domains):
                    if isinstance(item, str):
                        raw_domain = item.strip().lower()
                        is_primary = False
                    elif isinstance(item, dict):
                        raw_domain = str(item.get("domain", "")).strip().lower()
                        is_primary = bool(item.get("is_primary", False))
                    else:
                        errors.append({"field": f"domains[{idx}]", "message": "Invalid domain entry format"})
                        continue

                    # Strip protocols, paths, query params if user pasted full URL
                    if "://" in raw_domain:
                        raw_domain = raw_domain.split("://", 1)[-1]
                    raw_domain = raw_domain.split("/")[0].split("?")[0].split("#")[0].strip().rstrip(".")

                    if not raw_domain:
                        errors.append({"field": f"domains[{idx}]", "message": "Domain cannot be blank"})
                        continue

                    if not DOMAIN_REGEX.match(raw_domain):
                        errors.append({
                            "field": f"domains[{idx}]",
                            "message": f"'{raw_domain}' is not a valid domain name (e.g. example.com)"
                        })
                        continue

                    if raw_domain in seen_domains:
                        continue  # deduplicate gracefully
                    seen_domains.add(raw_domain)

                    if is_primary:
                        primary_count += 1

                    cleaned_domains.append({
                        "domain": raw_domain,
                        "is_primary": is_primary
                    })

                # If no domain marked primary but domains exist, mark the first as primary
                if cleaned_domains and primary_count == 0:
                    cleaned_domains[0]["is_primary"] = True
                elif primary_count > 1:
                    # Enforce only one primary
                    found_first = False
                    for d in cleaned_domains:
                        if d["is_primary"]:
                            if not found_first:
                                found_first = True
                            else:
                                d["is_primary"] = False

                cleaned["domains"] = cleaned_domains

        # 5. Social Handles
        if "social_handles" in data:
            raw_handles = data["social_handles"]
            if not isinstance(raw_handles, list):
                errors.append({"field": "social_handles", "message": "Social handles must be a list"})
            else:
                cleaned_handles = []
                for idx, item in enumerate(raw_handles):
                    if not isinstance(item, dict):
                        errors.append({"field": f"social_handles[{idx}]", "message": "Handle must be an object"})
                        continue

                    platform = str(item.get("platform", "")).strip().lower()
                    handle = str(item.get("handle", "")).strip()
                    if "://" in handle:
                        handle = handle.split("://", 1)[-1].rstrip("/").split("/")[-1]
                    handle = handle.lstrip("@").strip()
                    url = str(item.get("url", "")).strip() if item.get("url") else None

                    if not platform:
                        errors.append({"field": f"social_handles[{idx}].platform", "message": "Platform is required"})
                    if not handle:
                        errors.append({"field": f"social_handles[{idx}].handle", "message": "Handle is required"})

                    if url:
                        parsed = urlparse(url)
                        if parsed.scheme.lower() not in SAFE_URL_SCHEMES:
                            errors.append({
                                "field": f"social_handles[{idx}].url",
                                "message": "Social handle URL must use http:// or https://"
                            })

                    if platform and handle:
                        cleaned_handles.append({
                            "platform": platform,
                            "handle": handle,
                            "url": url
                        })

                cleaned["social_handles"] = cleaned_handles

        # 6. App Identifiers
        if "app_identifiers" in data:
            raw_apps = data["app_identifiers"]
            if not isinstance(raw_apps, list):
                errors.append({"field": "app_identifiers", "message": "App identifiers must be a list"})
            else:
                cleaned_apps = []
                for idx, item in enumerate(raw_apps):
                    if not isinstance(item, dict):
                        errors.append({"field": f"app_identifiers[{idx}]", "message": "App identifier must be an object"})
                        continue

                    platform = str(item.get("platform", "")).strip().lower()
                    identifier = str(item.get("identifier", "")).strip()
                    if "id=" in identifier:
                        identifier = identifier.split("id=")[-1].split("&")[0].strip()
                    elif "/app/" in identifier:
                        identifier = identifier.rstrip("/").split("/")[-1].strip()
                    app_name = str(item.get("app_name", "")).strip() if item.get("app_name") else None

                    if not platform:
                        errors.append({"field": f"app_identifiers[{idx}].platform", "message": "Platform is required"})
                    if not identifier:
                        errors.append({"field": f"app_identifiers[{idx}].identifier", "message": "Identifier is required"})

                    if platform and identifier:
                        cleaned_apps.append({
                            "platform": platform,
                            "identifier": identifier,
                            "app_name": app_name
                        })

                cleaned["app_identifiers"] = cleaned_apps

        # 7. Publishers
        if "publishers" in data:
            raw_pubs = data["publishers"]
            if not isinstance(raw_pubs, list):
                errors.append({"field": "publishers", "message": "Publishers must be a list"})
            else:
                cleaned_pubs = []
                for idx, item in enumerate(raw_pubs):
                    if isinstance(item, str):
                        pub_name = item.strip()
                        pub_platform = None
                    elif isinstance(item, dict):
                        pub_name = str(item.get("publisher_name", "")).strip()
                        pub_platform = str(item.get("platform", "")).strip() if item.get("platform") else None
                    else:
                        errors.append({"field": f"publishers[{idx}]", "message": "Publisher must be a string or object"})
                        continue

                    if not pub_name:
                        errors.append({"field": f"publishers[{idx}]", "message": "Publisher name cannot be blank"})
                        continue

                    cleaned_pubs.append({
                        "publisher_name": pub_name,
                        "platform": pub_platform
                    })

                cleaned["publishers"] = cleaned_pubs

        return cleaned, errors
