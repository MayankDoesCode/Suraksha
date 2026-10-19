"""
Seed realistic demonstration brand and candidate threat findings.
Complies with Zero-Fabrication policy: all generated records are explicitly labelled
with is_sample=True ('Sample Feed' / 'Sample Dataset').
"""
import os
import sys

# Ensure backend root is in python path
current_dir = os.path.dirname(os.path.abspath(__file__))
app_dir = os.path.dirname(current_dir)
backend_dir = os.path.dirname(app_dir)
root_dir = os.path.dirname(backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app.database import init_db, get_db
from backend.app.models.brand import Brand, BrandDomain, BrandSocialHandle, BrandAppIdentifier, BrandPublisher
from backend.app.services.detection_service import DetectionService

INDIAN_BRANDS = [
    ("State Bank of India", "sbi.co.in"), ("HDFC Bank", "hdfcbank.com"), ("ICICI Bank", "icicibank.com"),
    ("Paytm", "paytm.com"), ("PhonePe", "phonepe.com"), ("IRCTC", "irctc.co.in"),
]


def seed_indian_brands(db):
    """Idempotently add brand profiles with their public primary domain (no handles or app ids are invented)."""
    for name, domain in INDIAN_BRANDS:
        if db.query(Brand).filter(Brand.name == name).first():
            continue
        b = Brand(name=name, description=f"{name} (seeded profile; verify assets before relying on it).")
        db.add(b)
        db.commit()
        db.refresh(b)
        db.add(BrandDomain(brand_id=b.id, domain=domain, is_primary=True))
        db.commit()


def seed_demo_data():
    database_url = os.getenv("DATABASE_URL", "sqlite:///sentinelshield.db")
    init_db(database_url)
    db = get_db()

    # Check if brand already exists
    existing_brand = db.query(Brand).filter(Brand.name == "Acme FinTech").first()
    if not existing_brand:
        print("[*] Creating demo brand 'Acme FinTech'...")
        brand = Brand(
            name="Acme FinTech",
            description="Global digital banking, enterprise payments, and consumer lending platform.",
            logo_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80"
        )
        db.add(brand)
        db.commit()
        db.refresh(brand)

        # Verified official assets
        domain = BrandDomain(brand_id=brand.id, domain="acmefinance.com", is_primary=True)
        handle = BrandSocialHandle(
            brand_id=brand.id,
            platform="twitter",
            handle="acmefinance",
            url="https://twitter.com/acmefinance"
        )
        app_id = BrandAppIdentifier(
            brand_id=brand.id,
            platform="android_play_store",
            identifier="com.acmefinance.app",
            app_name="Acme Mobile Banking"
        )
        pub = BrandPublisher(
            brand_id=brand.id,
            publisher_name="Acme Financial Services Ltd",
            platform="android_play_store"
        )
        db.add_all([domain, handle, app_id, pub])
        db.commit()
    else:
        brand = existing_brand
        print(f"[*] Found existing demo brand '{brand.name}'.")

    seed_indian_brands(db)

    # Evaluate realistic sample candidates using the Detection Engine
    detection_service = DetectionService()

    sample_candidates = [
        {
            "asset_type": "social",
            "candidate_name": "@acmefinance_support",
            "display_name": "Acme FinTech Customer Care Helpdesk",
            "source_url": "https://twitter.com/acmefinance_support",
            "platform": "twitter",
            "website_url": "https://acmefinance-kyc-verify.xyz",
            "detection_source": "sample_feed",
            "is_sample": True,
        },
        {
            "asset_type": "social",
            "candidate_name": "@acmefinance_official_claims",
            "display_name": "Acme Financial Claims & Refund Team",
            "source_url": "https://twitter.com/acmefinance_official_claims",
            "platform": "twitter",
            "website_url": "https://acme-refund-portal.org",
            "detection_source": "sample_feed",
            "is_sample": True,
        },
        {
            "asset_type": "mobile_app",
            "candidate_name": "Acme FinTech Quick Loan & Cash",
            "package_id": "com.acmefinance.quickloan.apk",
            "publisher_name": "Apex MicroFinance Holdings Ltd",
            "description": "Instant micro-loans for Acme FinTech banking customers. Quick authorization without credit check.",
            "source_url": "https://play.google.com/store/apps/details?id=com.acmefinance.quickloan.apk",
            "platform": "android_play_store",
            "detection_source": "sample_feed",
            "is_sample": True,
        },
        {
            "asset_type": "mobile_app",
            "candidate_name": "Acme Pay Wallet 2026",
            "package_id": "com.acmepay.wallet.release",
            "publisher_name": "Unknown Global Studio",
            "description": "Mobile wallet payments app mimicking official Acme FinTech account interfaces.",
            "source_url": "https://play.google.com/store/apps/details?id=com.acmepay.wallet.release",
            "platform": "android_play_store",
            "detection_source": "sample_feed",
            "is_sample": True,
        },
    ]

    print("[*] Evaluating and persisting sample threat findings via detection engine...")
    for cand in sample_candidates:
        res = detection_service.evaluate_candidate(brand.id, cand, persist=True)
        print(f"    -> Evaluated '{cand['candidate_name']}': Score={res['risk_score']} Severity={res['severity']}")

    print("[OK] Demonstration seed completed successfully.")

if __name__ == "__main__":
    seed_demo_data()
