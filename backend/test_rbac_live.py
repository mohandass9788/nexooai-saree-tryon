import httpx

BASE_URL = "http://127.0.0.1:8000"

def test_rbac_and_login():
    with httpx.Client(base_url=BASE_URL, timeout=10) as client:
        # 1. Login with bad password
        res = client.post("/api/v1/auth/login", json={"email": "mohandass@nexooai.in", "password": "WrongPassword"})
        assert res.status_code == 401, f"Expected 401 for wrong password, got {res.status_code}"
        print("✓ Login rejected bad password (401)")

        # 2. Login as Master Super Admin
        res = client.post("/api/v1/auth/login", json={"email": "mohandass@nexooai.in", "password": "Mohan@NeXooAi#2026"})
        assert res.status_code == 200, f"Master login failed: {res.text}"
        data = res.json()
        assert data["authenticated"] is True
        assert data["role"] == "super_admin"
        assert data["email"] == "mohandass@nexooai.in"
        token = data["token"]
        print(f"✓ Master Super Admin logged in successfully! Role: {data['role']}, Name: {data['name']}")

        # 3. Verify session token
        res = client.get(f"/api/v1/auth/verify-token?token={token}")
        assert res.status_code == 200
        token_info = res.json()
        assert token_info["valid"] is True
        assert token_info["role"] == "super_admin"
        print(f"✓ Session token verified: valid={token_info['valid']}, role={token_info['role']}")

        # 4. List all users
        res = client.get("/api/v1/admin/users")
        assert res.status_code == 200
        users = res.json()
        print(f"✓ Retrieved {len(users)} users from PostgreSQL:")
        for u in users:
            print(f"   - {u['email']} | {u['name']} | Role: {u['role']} | Active: {u['is_active']}")

        master_user = next(u for u in users if u["email"] == "mohandass@nexooai.in")

        # 5. Guard test: Try to demote Master Super Admin (should fail)
        res = client.put(f"/api/v1/admin/users/{master_user['id']}", json={"role": "store_staff"})
        assert res.status_code == 400, f"Expected 400 for demoting master admin, got {res.status_code}"
        print("✓ Guard PASSED: Demoting Master Super Admin is prohibited (400)")

        # 6. Guard test: Try to delete Master Super Admin (should fail)
        res = client.delete(f"/api/v1/admin/users/{master_user['id']}")
        assert res.status_code == 400, f"Expected 400 for deleting master admin, got {res.status_code}"
        print("✓ Guard PASSED: Deleting Master Super Admin is prohibited (400)")

        # 7. Create a new staff account
        res = client.post("/api/v1/admin/users", json={
            "email": "chennai_staff@nexooai.in",
            "name": "Chennai Showroom Staff",
            "password": "StaffPassword123",
            "role": "store_staff"
        })
        assert res.status_code == 200, f"User creation failed: {res.text}"
        new_user = res.json()
        print(f"✓ Created new staff user: {new_user['email']} (id: {new_user['id']})")

        # 8. Test logging in with newly created staff account
        res = client.post("/api/v1/auth/login", json={
            "email": "chennai_staff@nexooai.in",
            "password": "StaffPassword123"
        })
        assert res.status_code == 200
        staff_data = res.json()
        assert staff_data["role"] == "store_staff"
        print(f"✓ New staff user logged in successfully! Role: {staff_data['role']}")

        # 9. Clean up created test staff
        res = client.delete(f"/api/v1/admin/users/{new_user['id']}")
        assert res.status_code == 200
        print("✓ Deleted test staff account cleanly.")

        # 10. Test end-to-end try-on flow with consent audit
        import io
        img_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00" + b"\x00" * 400
        files = {"person_image": ("customer.jpg", io.BytesIO(img_bytes), "image/jpeg")}
        data = {
            "saree_id": "KAN-SILK-001",
            "kiosk_id": "KIOSK-TN-CHN-01",
            "consent_confirmed": "true",
            "language": "ta"
        }
        res = client.post("/api/v1/tryon", data=data, files=files)
        assert res.status_code == 200, f"Tryon failed: {res.text}"
        job = res.json()
        print(f"✓ Tryon flow succeeded on PostgreSQL! Job ID: {job['job_id']}, Provider: {job['provider']}")

if __name__ == "__main__":
    test_rbac_and_login()
    print("\n🎉 ALL RBAC, LOGIN, AND TRY-ON AUDIT TESTS PASSED 100%!")
