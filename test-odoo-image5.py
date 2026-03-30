# -*- coding: utf-8 -*-
import urllib.request, urllib.error, json, http.cookiejar, sys, os

sys.stdout.reconfigure(encoding='utf-8')

with open('apps/api/.env', encoding='utf-8') as f:
    env = {k.strip(): v.strip() for line in f for k, _, v in [line.partition('=')] if not line.startswith('#') and '=' in line}

token = env.get('ODOO_API_TOKEN', '').strip('"')
user = env.get('ODOO_API_USER', '')
BASE = "https://erp.cnyrxapp.com"

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# Test: read body even on 404 (Odoo 11 quirk)
product_id = 483
url = f"{BASE}/web/image/product.product/{product_id}/image_1920"

print(f"Fetching: {url}")
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with opener.open(req, timeout=10) as r:
        data = r.read()
        ct = r.headers.get("Content-Type", "")
        print(f"Status: 200, CT: {ct}, Size: {len(data)}")
        with open("test-product-image.png", "wb") as f:
            f.write(data)
        print("Saved!")
except urllib.error.HTTPError as e:
    # Read body even on error
    body = e.read()
    ct = e.headers.get("Content-Type", "")
    print(f"Status: {e.code}, CT: {ct}, Body size: {len(body)}")
    print(f"Body starts with: {body[:20]}")
    
    # If it's an image, save it
    if body[:4] in [b'\x89PNG', b'\xff\xd8\xff\xe0', b'\xff\xd8\xff\xe1', b'GIF8', b'RIFF']:
        ext = "png" if body[:4] == b'\x89PNG' else "jpg"
        fname = f"test-product-image.{ext}"
        with open(fname, "wb") as f:
            f.write(body)
        print(f"Image saved to {fname} ({len(body)} bytes)")
    elif b'PNG' in body[:10] or b'JFIF' in body[:20]:
        with open("test-product-image.bin", "wb") as f:
            f.write(body)
        print(f"Binary saved ({len(body)} bytes)")

# Also test product_template_id (might differ from product_id)
# Try getting template_id via JSONRPC
print("\n=== Get product template ID ===")
body_rpc = {
    "jsonrpc": "2.0", "method": "call",
    "params": {
        "model": "product.product",
        "method": "read",
        "args": [[product_id], ["product_tmpl_id", "name"]],
        "kwargs": {}
    }
}
req2 = urllib.request.Request(
    BASE + "/web/dataset/call_kw",
    data=json.dumps(body_rpc).encode(),
    headers={
        "Content-Type": "application/json",
        "Api-User": user,
        "User-Token": token,
        "User-Agent": "Mozilla/5.0",
    },
    method="POST"
)
try:
    with opener.open(req2, timeout=10) as r:
        data2 = json.loads(r.read())
        print(json.dumps(data2.get("result", data2.get("error")), ensure_ascii=False, indent=2)[:300])
except urllib.error.HTTPError as e:
    body2 = e.read()
    print(f"HTTP {e.code}: {body2[:200]}")
