# -*- coding: utf-8 -*-
import urllib.request, urllib.error, json, http.cookiejar, sys

sys.stdout.reconfigure(encoding='utf-8')

with open('apps/api/.env', encoding='utf-8') as f:
    env = {k.strip(): v.strip() for line in f for k, _, v in [line.partition('=')] if not line.startswith('#') and '=' in line}

token = env.get('ODOO_API_TOKEN', '').strip('"')
user = env.get('ODOO_API_USER', '')
BASE = "https://erp.cnyrxapp.com"

# Create cookie jar for session
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def call(endpoint, body, extra_headers=None):
    headers = {
        "Content-Type": "application/json",
        "Api-User": user,
        "User-Token": token,
        "User-Agent": "Mozilla/5.0 (compatible; TelepharmacyERP/1.0)",
    }
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(
        BASE + endpoint,
        data=json.dumps(body).encode(),
        headers=headers,
        method="POST"
    )
    with opener.open(req, timeout=15) as r:
        return json.loads(r.read())

# Step 1: Login to get session
print("=== Login ===")
login_body = {
    "jsonrpc": "2.0",
    "method": "call",
    "params": {
        "db": "CNY-DB2022-1",
        "login": user,
        "password": token
    }
}
try:
    login_data = call("/web/session/authenticate", login_body)
    uid = login_data.get("result", {}).get("uid")
    print(f"  uid: {uid}")
    if uid:
        print("  Login SUCCESS")
    else:
        print("  Login FAILED (uid=False) - trying image with session anyway")
except Exception as e:
    print(f"  Login exception: {e}")

# Step 2: Try image URL with session cookie
print("\n=== Try image with session ===")
product_id = 483
image_urls = [
    f"{BASE}/web/image/product.product/{product_id}/image_1920",
    f"{BASE}/web/image/product.product/{product_id}/image_512",
    f"{BASE}/web/image/product.product/{product_id}/image",
    f"{BASE}/web/image/product.template/{product_id}/image",
]

for url in image_urls:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with opener.open(req, timeout=8) as r:
            ct = r.headers.get("Content-Type", "")
            data = r.read()
            print(f"  OK: {url}")
            print(f"     Content-Type: {ct}, Size: {len(data)} bytes")
            # Save the image
            if "image" in ct:
                ext = "jpg" if "jpeg" in ct else "png"
                with open(f"test-product-image.{ext}", "wb") as f:
                    f.write(data)
                print(f"     Saved to test-product-image.{ext}")
            break
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors='replace')[:100]
        print(f"  HTTP {e.code}: {url}")
        print(f"     {body[:80]}")
    except Exception as e:
        print(f"  ERR: {url} -> {str(e)[:80]}")

# Step 3: Try JSONRPC with session
print("\n=== Try JSONRPC read with session ===")
body = {
    "jsonrpc": "2.0",
    "method": "call",
    "params": {
        "model": "product.product",
        "method": "read",
        "args": [[product_id], ["image_1920", "image_512", "image_medium"]],
        "kwargs": {}
    }
}
try:
    data = call("/web/dataset/call_kw", body)
    result = data.get("result", [])
    if result:
        rec = result[0]
        for k in ["image_1920", "image_512", "image_medium"]:
            v = rec.get(k)
            if v and v is not False:
                print(f"  {k}: base64 len={len(str(v))} chars")
                # Save first image found
                import base64
                img_data = base64.b64decode(str(v))
                with open(f"test-product-{k}.jpg", "wb") as f:
                    f.write(img_data)
                print(f"  Saved to test-product-{k}.jpg ({len(img_data)} bytes)")
            else:
                print(f"  {k}: not available")
    else:
        print("  Error:", data.get("error", {}).get("message", "unknown"))
except Exception as e:
    print(f"  Exception: {e}")
