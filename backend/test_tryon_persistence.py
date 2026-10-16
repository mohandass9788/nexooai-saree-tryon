import io
import urllib.request
import json
from PIL import Image

# 1. Create a synthetic test portrait JPEG
img = Image.new("RGB", (768, 1024), color=(220, 190, 170))
buf = io.BytesIO()
img.save(buf, format="JPEG")
person_bytes = buf.getvalue()

# 2. Prepare multipart form data
boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
body = bytearray()

def add_field(name, value):
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
    body.extend(f"{value}\r\n".encode("utf-8"))

def add_file(name, filename, data, content_type="image/jpeg"):
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode("utf-8"))
    body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
    body.extend(data)
    body.extend(b"\r\n")

add_file("person_image", "customer_test.jpg", person_bytes)
add_field("saree_id", "KAN-SILK-001")
add_field("consent_confirmed", "True")
add_field("language", "ta")
body.extend(f"--{boundary}--\r\n".encode("utf-8"))

# 3. Send POST /api/v1/tryon
req = urllib.request.Request(
    "http://127.0.0.1:8000/api/v1/tryon",
    data=bytes(body),
    headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    method="POST",
)

try:
    with urllib.request.urlopen(req) as resp:
        res_data = json.loads(resp.read().decode("utf-8"))
        print("TRYON API RESPONSE:")
        print(f"  Job ID: {res_data.get('job_id')}")
        print(f"  Status: {res_data.get('status')}")
        print(f"  Result Image URL: {res_data.get('result_image_url')}")
        print(f"  Download Token: {res_data.get('download_token')}")
        print(f"  Processing Time: {res_data.get('processing_time_ms')} ms")

        # 4. Verify the result image can be fetched directly from storage
        result_url = res_data.get("result_image_url")
        if result_url:
            full_url = f"http://127.0.0.1:8000{result_url}" if result_url.startswith("/") else result_url
            with urllib.request.urlopen(full_url) as img_resp:
                img_data = img_resp.read()
                print(f"VERIFIED RESULT IMAGE PERSISTED ON SERVER: {len(img_data)} bytes fetched (HTTP {img_resp.status})")

except Exception as e:
    print(f"Tryon API failed: {e}")
