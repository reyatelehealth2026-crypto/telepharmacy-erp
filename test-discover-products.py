# -*- coding: utf-8 -*-
import urllib.request, json, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('apps/api/.env', encoding='utf-8') as f:
    env = {k.strip(): v.strip() for line in f for k, _, v in [line.partition('=')] if not line.startswith('#') and '=' in line}

token = env.get('ODOO_API_TOKEN', '').strip('"')
user = env.get('ODOO_API_USER', '')
BASE = "https://erp.cnyrxapp.com"
IMG_BASE = "https://manager.cnypharmacy.com/uploads/product_photo"

HEADERS = {
    "Content-Type": "application/json",
    "Api-User": user,
    "User-Token": token,
    "User-Agent": "Mozilla/5.0 (compatible; TelepharmacyERP/1.0)",
}

# Try to get directory listing or product list from manager site
print("=== Try manager.cnypharmacy.com ===")
test_urls = [
    "https://manager.cnypharmacy.com/uploads/product_photo/",
    "https://manager.cnypharmacy.com/api/products",
    "https://manager.cnypharmacy.com/api/v1/products",
]
for url in test_urls:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            ct = r.headers.get("Content-Type", "")
            body = r.read()
            print(f"  OK {url} [{ct}] {len(body)} bytes")
            print(f"  First 200: {body[:200]}")
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {url}")
    except Exception as e:
        print(f"  ERR: {url} -> {str(e)[:60]}")

# Try numeric codes 0001-0100 to see which ones have images
print("\n=== Probe image codes 0001-0050 ===")
found_codes = []
for i in range(1, 51):
    code = f"{i:04d}"
    url = f"{IMG_BASE}/{code}.jpg"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as r:
            size = int(r.headers.get("Content-Length", 0))
            if size > 5000:  # real image > 5KB
                found_codes.append(code)
                print(f"  FOUND: {code} ({size} bytes)")
    except:
        pass

print(f"\nFound {len(found_codes)} codes with real images: {found_codes[:20]}")
