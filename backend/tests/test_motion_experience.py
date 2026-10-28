import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

@pytest.mark.asyncio
async def test_motion_turntable_endpoint(isolated_database):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/motion/turntable/sar_kanchi_gold_01")
        assert resp.status_code == 200
        data = resp.json()
        assert data["product_id"] == "sar_kanchi_gold_01"
        assert data["total_frames"] == 8
        assert len(data["angles"]) == 8
        assert "frame_000.webp" in data["frame_urls"][0]
        assert data["standard_spec"]["resolution"] == "1080x1920 (9:16 portrait)"


@pytest.mark.asyncio
async def test_motion_catwalk_job_lifecycle(isolated_database):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Without consent: must fail
        fail_resp = await client.post(
            "/api/v1/motion/catwalk-job",
            json={"tryon_job_id": "job_123", "product_id": "p_1", "user_consent": False},
        )
        assert fail_resp.status_code == 400

        # With consent: must succeed
        req_payload = {
            "tryon_job_id": "job_123",
            "product_id": "sar_banarasi_red",
            "user_consent": True,
            "motion_type": "catwalk_runway",
            "cost_cap_acknowledged": True,
        }
        resp = await client.post("/api/v1/motion/catwalk-job", json=req_payload)
        assert resp.status_code == 202
        data = resp.json()
        assert data["status"] == "processing"
        assert data["cost_usd"] == 0.04
        job_id = data["job_id"]

        # Poll status
        status_resp = await client.get(f"/api/v1/motion/catwalk-job/{job_id}")
        assert status_resp.status_code == 200
        st_data = status_resp.json()
        assert st_data["status"] in ["processing", "completed"]


@pytest.mark.asyncio
async def test_motion_enhancements_presets(isolated_database):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/motion/enhancements/presets")
        assert resp.status_code == 200
        presets = resp.json()
        assert len(presets) >= 4
        categories = {p["category"] for p in presets}
        assert "lighting" in categories
        assert "jewellery" in categories


@pytest.mark.asyncio
async def test_motion_metrics_telemetry(isolated_database):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        event = {
            "action": "slider_interaction",
            "product_id": "sar_kanchi_01",
            "session_id": "sess_abc",
            "duration_ms": 3200,
            "metadata": {"zoom_level": "2.0x"},
        }
        resp = await client.post("/api/v1/motion/metrics", json=event)
        assert resp.status_code == 201

        summary_resp = await client.get("/api/v1/motion/metrics/summary")
        assert summary_resp.status_code == 200
        summary = summary_resp.json()
        assert summary["total_events"] > 0
        assert "slider_interaction" in summary["action_breakdown"]
