import re
from typing import Optional, Dict, Any, Tuple

# Common global brand marks frequently targeted by phishing campaigns
GLOBAL_BRAND_CATALOG = {
    # Tech & Cloud Titans
    "google": {"name": "Google", "domain": "google.com", "category": "Search & Cloud"},
    "microsoft": {"name": "Microsoft", "domain": "microsoft.com", "category": "Enterprise Software"},
    "apple": {"name": "Apple", "domain": "apple.com", "category": "Technology & Hardware"},
    "icloud": {"name": "Apple iCloud", "domain": "icloud.com", "category": "Cloud Services"},
    "amazon": {"name": "Amazon", "domain": "amazon.com", "category": "E-Commerce & Cloud"},
    "meta": {"name": "Meta", "domain": "meta.com", "category": "Social Media"},
    "facebook": {"name": "Facebook", "domain": "facebook.com", "category": "Social Media"},
    "instagram": {"name": "Instagram", "domain": "instagram.com", "category": "Social Media"},
    "whatsapp": {"name": "WhatsApp", "domain": "whatsapp.com", "category": "Messaging & Social"},
    "telegram": {"name": "Telegram", "domain": "telegram.org", "category": "Messaging & Social"},
    "twitter": {"name": "X (Twitter)", "domain": "x.com", "category": "Social Media"},
    "discord": {"name": "Discord", "domain": "discord.com", "category": "Communication & Gaming"},
    "linkedin": {"name": "LinkedIn", "domain": "linkedin.com", "category": "Professional Social"},
    "github": {"name": "GitHub", "domain": "github.com", "category": "Developer Platform"},
    "adobe": {"name": "Adobe", "domain": "adobe.com", "category": "Creative Software"},
    "zoom": {"name": "Zoom", "domain": "zoom.us", "category": "Video Conferencing"},
    "docusign": {"name": "DocuSign", "domain": "docusign.com", "category": "Electronic Signature"},
    "spotify": {"name": "Spotify", "domain": "spotify.com", "category": "Audio & Streaming"},
    "steam": {"name": "Steam", "domain": "steampowered.com", "category": "Gaming Platform"},
    "netflix": {"name": "Netflix", "domain": "netflix.com", "category": "Entertainment & Streaming"},

    # Global Banking & FinTech
    "paypal": {"name": "PayPal", "domain": "paypal.com", "category": "FinTech & Payments"},
    "stripe": {"name": "Stripe", "domain": "stripe.com", "category": "Payment Infrastructure"},
    "revolut": {"name": "Revolut", "domain": "revolut.com", "category": "Digital Banking"},
    "chase": {"name": "Chase Bank", "domain": "chase.com", "category": "Banking & Finance"},
    "wells fargo": {"name": "Wells Fargo", "domain": "wellsfargo.com", "category": "Banking & Finance"},
    "wellsfargo": {"name": "Wells Fargo", "domain": "wellsfargo.com", "category": "Banking & Finance"},
    "citibank": {"name": "Citibank", "domain": "citi.com", "category": "Banking & Finance"},
    "citi": {"name": "Citibank", "domain": "citi.com", "category": "Banking & Finance"},
    "bank of america": {"name": "Bank of America", "domain": "bankofamerica.com", "category": "Banking & Finance"},
    "bofa": {"name": "Bank of America", "domain": "bankofamerica.com", "category": "Banking & Finance"},

    # Indian Banking & UPI Giants
    "sbi": {"name": "State Bank of India", "domain": "sbi.co.in", "category": "Banking & Finance"},
    "hdfc": {"name": "HDFC Bank", "domain": "hdfcbank.com", "category": "Banking & Finance"},
    "icici": {"name": "ICICI Bank", "domain": "icicibank.com", "category": "Banking & Finance"},
    "axis": {"name": "Axis Bank", "domain": "axisbank.com", "category": "Banking & Finance"},
    "axisbank": {"name": "Axis Bank", "domain": "axisbank.com", "category": "Banking & Finance"},
    "kotak": {"name": "Kotak Mahindra Bank", "domain": "kotak.com", "category": "Banking & Finance"},
    "paytm": {"name": "Paytm", "domain": "paytm.com", "category": "Payments & Wallet"},
    "phonepe": {"name": "PhonePe", "domain": "phonepe.com", "category": "Payments & UPI"},

    # Crypto & Web3
    "binance": {"name": "Binance", "domain": "binance.com", "category": "Crypto & Web3"},
    "coinbase": {"name": "Coinbase", "domain": "coinbase.com", "category": "Crypto & Web3"},
    "kraken": {"name": "Kraken", "domain": "kraken.com", "category": "Crypto & Web3"},
    "metamask": {"name": "MetaMask", "domain": "metamask.io", "category": "Crypto Wallet"},
    "trustwallet": {"name": "Trust Wallet", "domain": "trustwallet.com", "category": "Crypto Wallet"},

    # Logistics & Retail
    "dhl": {"name": "DHL Express", "domain": "dhl.com", "category": "Logistics & Delivery"},
    "fedex": {"name": "FedEx", "domain": "fedex.com", "category": "Logistics & Delivery"},
    "ups": {"name": "UPS", "domain": "ups.com", "category": "Logistics & Delivery"},
    "usps": {"name": "USPS", "domain": "usps.com", "category": "Postal & Logistics"},
    "indiapost": {"name": "India Post", "domain": "indiapost.gov.in", "category": "Postal & Logistics"},
    "ebay": {"name": "eBay", "domain": "ebay.com", "category": "E-Commerce"},
    "walmart": {"name": "Walmart", "domain": "walmart.com", "category": "Retail & E-Commerce"},
    "rolex": {"name": "Rolex", "domain": "rolex.com", "category": "Luxury & Watches"},
    "nike": {"name": "Nike", "domain": "nike.com", "category": "Apparel & Footwear"},
    "apexpay": {"name": "ApexPay", "domain": "apexpay.com", "category": "Enterprise Payments"},
    "acme": {"name": "Acme Corp", "domain": "acme.com", "category": "Enterprise Technology"},
}


class BrandExtractor:
    """
    Auto-detects the impersonated brand from raw candidate URLs, domains, or social handles.
    Allows testing arbitrary links against known target profiles without manual brand switching.
    """

    @classmethod
    def detect_target_brand(cls, raw_input: str, registered_brand_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Inspect domain SLD, subdomains, path tokens, and query strings to determine
        the intended brand mark being impersonated.
        """
        text = str(raw_input or "").lower().strip()
        
        # Strip protocols and parameters for clean tokenization
        clean = re.sub(r"^https?://", "", text)
        clean = re.sub(r"^www\.", "", clean)
        host = clean.split("/")[0].split(":")[0]

        # 1. First priority: Check if the registered active brand mark matches
        if registered_brand_name:
            reg_clean = registered_brand_name.lower().strip()
            reg_compact = re.sub(r"[^a-z0-9]", "", reg_clean)
            if reg_compact and (reg_compact in host or reg_clean in text):
                return {
                    "is_known_brand": True,
                    "brand_name": registered_brand_name,
                    "official_domain": None,
                    "category": "Active Protected Brand",
                    "detection_confidence": 0.98,
                    "is_active_brand": True,
                }

        # 2. Match against global brand catalog
        host_tokens = re.split(r"[-_.\d]+", host)
        path_tokens = re.split(r"[-_/.\d]+", clean)

        for key, info in GLOBAL_BRAND_CATALOG.items():
            compact_key = key.replace(" ", "")
            # Check standalone host tokens
            if compact_key in host_tokens or key in host_tokens:
                return {
                    "is_known_brand": True,
                    "brand_name": info["name"],
                    "official_domain": info["domain"],
                    "category": info["category"],
                    "detection_confidence": 0.95,
                    "is_active_brand": False,
                }
            # Check host substring (e.g. 'paypal-update' or 'netflix-login')
            if len(compact_key) >= 4 and compact_key in host:
                return {
                    "is_known_brand": True,
                    "brand_name": info["name"],
                    "official_domain": info["domain"],
                    "category": info["category"],
                    "detection_confidence": 0.90,
                    "is_active_brand": False,
                }

        # 3. If no catalog match, extract primary domain SLD as the candidate brand
        parts = host.split(".")
        candidate_sld = parts[-2] if len(parts) >= 2 else host
        # Strip generic prefixes like 'login-', 'verify-', 'secure-'
        inferred_brand = re.sub(r"^(login|verify|auth|secure|account|update|support|portal)[-_]", "", candidate_sld)
        inferred_brand = re.sub(r"[-_](login|verify|auth|secure|account|update|support|portal)$", "", inferred_brand)
        inferred_brand = inferred_brand.capitalize()

        return {
            "is_known_brand": False,
            "brand_name": inferred_brand or "Unknown Entity",
            "official_domain": f"{inferred_brand.lower()}.com" if inferred_brand else None,
            "category": "Inferred Domain Label",
            "detection_confidence": 0.60,
            "is_active_brand": False,
        }
