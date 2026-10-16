import urllib.request
import json

urls = [
    ('http://127.0.0.1:8000/api/v1/health', 'Health'),
    ('http://127.0.0.1:8000/api/v1/catalog/categories/list', 'Categories'),
    ('http://127.0.0.1:8000/api/v1/catalog', 'Catalog'),
    ('http://127.0.0.1:8000/api/v1/admin/metrics', 'Metrics'),
    ('http://127.0.0.1:8000/api/v1/admin/products', 'Admin Products'),
    ('http://127.0.0.1:8000/kiosk/', 'Production Angular SPA'),
]

for url, label in urls:
    try:
        with urllib.request.urlopen(url) as resp:
            data = resp.read()
            print(f"SUCCESS: {label} -> {resp.status} ({len(data)} bytes)")
            if 'api/v1' in url:
                parsed = json.loads(data.decode('utf-8'))
                if isinstance(parsed, dict) and 'total' in parsed:
                    print(f"   Total items from DB: {parsed['total']}")
                elif isinstance(parsed, list):
                    print(f"   List length from DB: {len(parsed)}")
                elif isinstance(parsed, dict) and 'total_tryons_today' in parsed:
                    print(f"   DB metrics: tryons today={parsed['total_tryons_today']}, success rate={parsed['success_rate_percent']}%")
    except Exception as e:
        print(f"FAILED: {label} -> {e}")
