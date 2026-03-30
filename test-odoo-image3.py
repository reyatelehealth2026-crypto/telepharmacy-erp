# -*- coding: utf-8 -*-
import urllib.request, json, urllib.error, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('apps/api/.env', encoding='utf-8') as f:
    env = {k.strip(): v.strip() for line in f for k, _, v in [line.partition('=')] if not line.startswith('#') and '=' in line}

token = env.get('ODOO_API_TOKEN', '').strip('"')
user = env.get('ODOO_API_USER', '')
BASE = "https://erp.cnyrxapp.com"

HEADERS = {
    "Content-Type": "application/json",
    "Api-User": user,
    "User-Token": token,
    "User-Agent": "Mozilla/5.0 (compatible; TelepharmacyERP/1.0)",
}

# product_id = 483 (from previous test)
product_id = 483

# Try common Odoo image URL patterns
image_urls = [
    f"{BASE}/web/image/product.product/{product_id}/image_1920",
    f"{BASE}/web/image/product.product/{product_id}/image_512",
    f"{BASE}/web/image/product.product/{product_id}/image_128",
    f"{BASE}/web/image/product.template/{product_id}/image_1920",
    f"{BASE}/web/image?model=product.product&id={product_id}&field=image_1920",
    f"{BASE}/web/binary/image?model=product.product&id={product_id}&field=image_medium",
]

print("Testing image URLs for product_id:", product_id)
found = False
for url in image_urls:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as r:
            ct = r.headers.get("Content-Type", "")
            data = r.read()
            print(f"  OK: {url}")
            print(f"     Content-Type: {ct}, Size: {len(data)} bytes")
            found = True
            break
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {url}")
    except Exception as e:
        print(f"  ERR: {url} -> {str(e)[:60]}")

if not found:
    print("No direct image URL works")

# Try JSONRPC to get image as base64
print("\n=== Try JSONRPC read image ===")
body = {
    "jsonrpc": "2.0",
    "method": "call",
    "params": {
        "model": "product.product",
        "method": "read",
        "args": [[product_id], ["image_1920", "image_512", "image_128", "image_medium"]],
        "kwargs": {}
    }
}
req = urllib.request.Request(
    BASE + "/web/dataset/call_kw",
    data=json.dumps(body).encode(),
    headers=HEADERS,
    method="POST"
)
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read())
        result = data.get("result", [])
        if result:
            rec = result[0]
            for k in ["image_1920", "image_512", "image_128", "image_medium"]:
                v = rec.get(k)
                if v and v is not False:
                    print(f"  {k}: base64 len={len(str(v))} chars (first 50: {str(v)[:50]})")
                else:
                    print(f"  {k}: not available")
        else:
            err = data.get("error", {})
            print("  Error:", err.get("message", "unknown"))
            print("  Data:", str(data)[:300])
except Exception as e:
    print(f"  Exception: {e}")
