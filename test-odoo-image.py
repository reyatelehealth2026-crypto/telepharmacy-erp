import urllib.request, json

with open('apps/api/.env') as f:
    env = {k.strip(): v.strip() for line in f for k, _, v in [line.partition('=')] if not line.startswith('#') and '=' in line}

token = env.get('ODOO_API_TOKEN', '').strip('"')
user = env.get('ODOO_API_USER', '')

print(f"User: {user}, Token len: {len(token)}")

BASE = "https://erp.cnyrxapp.com"

def call(endpoint, body):
    req = urllib.request.Request(
        BASE + endpoint,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "Api-User": user,
            "User-Token": token,
            "User-Agent": "Mozilla/5.0 (compatible; TelepharmacyERP/1.0)",
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

# Test with product 0001
print("\n=== get_product 0001 ===")
data = call("/ineco_gc/get_product", {"PRODUCT_CODE": "0001"})
result = data.get("result", {})
if result.get("products"):
    p = result["products"][0]
    print("Keys:", list(p.keys()))
    # Look for image-related fields
    for k, v in p.items():
        if any(x in k.lower() for x in ["image", "img", "photo", "pic", "url"]):
            print(f"  IMAGE FIELD: {k} = {str(v)[:200]}")
    print(f"  name: {p.get('name')}")
    print(f"  barcode: {p.get('barcode')}")
else:
    print("Error:", result.get("error"))

# Test get_sku to see if it has image
print("\n=== get_sku ===")
data2 = call("/ineco_gc/get_sku", {"SKU": "0001-ขวด[60ML]", "PRODUCT_CODE": "0001", "UOM_FACTOR": 1})
result2 = data2.get("result", {})
print("Keys:", list(result2.keys()))
if result2.get("products"):
    p2 = result2["products"][0]
    print("Product keys:", list(p2.keys()))
    for k, v in p2.items():
        if any(x in k.lower() for x in ["image", "img", "photo", "pic", "url"]):
            print(f"  IMAGE FIELD: {k} = {str(v)[:200]}")
