# -*- coding: utf-8 -*-
import urllib.request, json, sys

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

def call(body):
    req = urllib.request.Request(BASE + "/ineco_gc/get_product", data=json.dumps(body).encode(), headers=HEADERS, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())

# Try pagination params
tests = [
    {},
    {"limit": 100},
    {"limit": 1000},
    {"page": 1, "limit": 100},
    {"offset": 0, "limit": 100},
    {"LIMIT": 100},
    {"OFFSET": 0, "LIMIT": 100},
    {"page": 1, "per_page": 100},
    {"active": True},
    {"active": True, "limit": 500},
]

for body in tests:
    try:
        data = call(body)
        result = data.get("result", {})
        prods = result.get("products", [])
        err = result.get("error")
        total = result.get("total")
        if prods:
            codes = [p.get("product_code") for p in prods[:5]]
            print(f"body={body} -> {len(prods)} products, total={total}, first codes: {codes}")
        elif err:
            print(f"body={body} -> ERR: {err}")
        else:
            print(f"body={body} -> {str(result)[:100]}")
    except Exception as e:
        print(f"body={body} -> EXC: {str(e)[:60]}")
