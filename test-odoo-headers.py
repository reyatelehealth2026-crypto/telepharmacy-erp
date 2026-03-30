import urllib.request, json, sys, os

# Read env
env = {}
with open('apps/api/.env') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, _, v = line.partition('=')
            env[k.strip()] = v.strip()

token = env.get('ODOO_API_TOKEN', '')
user = env.get('ODOO_API_USER', '')

print(f"User: {user}")
print(f"Token length: {len(token)}")
print(f"Token[:40]: {token[:40]}")
print()

BASE = "https://erp.cnyrxapp.com"
BODY = json.dumps({"PRODUCT_CODE": "0001"}).encode()

def test(label, headers):
    h = {"Content-Type": "application/json", **headers}
    req = urllib.request.Request(BASE + "/ineco_gc/get_product", data=BODY, headers=h, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
            result = data.get("result", {})
            err = result.get("error")
            prods = result.get("products", [])
            if err:
                print(f"  [{label}] ERROR: {err}")
            else:
                p = prods[0] if prods else {}
                print(f"  [{label}] SUCCESS! name={p.get('name','?')} stock={p.get('saleable_qty','?')}")
    except urllib.error.HTTPError as e:
        print(f"  [{label}] HTTP {e.code}: {e.reason}")
    except Exception as e:
        print(f"  [{label}] EXCEPTION: {e}")

print("Testing header combinations:")
test("Api-User + User-Token", {"Api-User": user, "User-Token": token})
test("User-Token only", {"User-Token": token})
test("api-user + user-token (lowercase)", {"api-user": user, "user-token": token})
test("X-Api-User + X-User-Token", {"X-Api-User": user, "X-User-Token": token})
