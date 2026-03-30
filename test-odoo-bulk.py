# -*- coding: utf-8 -*-
import urllib.request, json, sys, time

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

def call(endpoint, body):
    req = urllib.request.Request(BASE + endpoint, data=json.dumps(body).encode(), headers=HEADERS, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

# Try various endpoints for bulk product list
endpoints_to_try = [
    ("/ineco_gc/get_products", {}),
    ("/ineco_gc/get_product_list", {}),
    ("/ineco_gc/get_all_products", {}),
    ("/ineco_gc/products", {}),
    ("/ineco_gc/get_product", {"PRODUCT_CODE": ""}),  # empty code
    ("/ineco_gc/get_product", {}),  # no code
]

for ep, body in endpoints_to_try:
    try:
        data = call(ep, body)
        result = data.get("result", {})
        if isinstance(result, dict):
            prods = result.get("products", [])
            err = result.get("error")
            if prods:
                print(f"OK {ep}: {len(prods)} products")
                print(f"  First: {prods[0].get('product_code')} - {prods[0].get('name','')[:40]}")
            elif err:
                print(f"ERR {ep}: {err}")
            else:
                print(f"EMPTY {ep}: {str(result)[:100]}")
        else:
            print(f"RESULT {ep}: {str(result)[:100]}")
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code} {ep}")
    except Exception as e:
        print(f"EXC {ep}: {str(e)[:60]}")
