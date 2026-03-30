import urllib.request, json

with open('apps/api/.env') as f:
    env = {k.strip(): v.strip() for line in f for k, _, v in [line.partition('=')] if not line.startswith('#') and '=' in line}

token = env.get('ODOO_API_TOKEN', '')
user = env.get('ODOO_API_USER', '')

BASE = "https://erp.cnyrxapp.com"
BODY = json.dumps({"PRODUCT_CODE": "0001"}).encode()

headers = {
    "Content-Type": "application/json",
    "Api-User": user,
    "User-Token": token,
    "User-Agent": "Mozilla/5.0 (compatible; TelepharmacyERP/1.0)",
}

req = urllib.request.Request(BASE + "/ineco_gc/get_product", data=BODY, headers=headers, method="POST")
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read())
        result = data.get("result", {})
        print(json.dumps(result, ensure_ascii=False, indent=2)[:500])
except urllib.error.HTTPError as e:
    body = e.read().decode()[:200]
    print(f"HTTP {e.code}: {e.reason}")
    print(body)
