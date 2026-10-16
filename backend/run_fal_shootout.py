#!/usr/bin/env python3
"""
NeXooAi Virtual Saree Try-On — fal.ai Model Shootout Benchmark Script
Compares:
1. Candidate A: FASHN v1.6 via fal.ai (fal-ai/fashn/tryon/v1.6)
2. Candidate B: Kling Kolors Virtual Try-On v1.5 via fal.ai (fal-ai/kling/v1-5/kolors-virtual-try-on)

Usage:
  python backend/run_fal_shootout.py --dry-run   (Safe validation, zero API requests, zero credits spent)
  python backend/run_fal_shootout.py --live      (Executes actual fal.ai API calls only when approved)
"""

import os
import sys
import json
import time
import asyncio
import argparse
from datetime import datetime
from pathlib import Path
from PIL import Image

# Add repository root to python path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.app.core.config import settings
from backend.app.services.tryon.cloud_engine import CloudApiTryOnEngine


BENCHMARK_PERSON = ROOT_DIR / "backend" / "app" / "static" / "benchmark_model.jpg"
BENCHMARK_SAREE = ROOT_DIR / "backend" / "app" / "static" / "sarees" / "real_kanchipuram.jpg"
BENCHMARK_WESTERN = ROOT_DIR / "backend" / "app" / "static" / "sarees" / "m-dhoti-006.jpg"
OUTPUT_DIR = ROOT_DIR / "media" / "shootout"


def inspect_asset(path: Path, label: str):
    if not path.exists():
        raise FileNotFoundError(f"Missing required benchmark asset: {path}")
    im = Image.open(path)
    file_size_kb = round(os.path.getsize(path) / 1024, 1)
    return {
        "label": label,
        "path": str(path),
        "dimensions": f"{im.size[0]}x{im.size[1]}",
        "format": im.format,
        "size_kb": file_size_kb,
    }


def run_dry_run():
    print("\n" + "=" * 75)
    print(" NeXooAi fal.ai Benchmark Shootout - DRY-RUN VALIDATION")
    print("=" * 75)

    # 1. Inspect API Key status safely
    fal_key = getattr(settings, "FAL_KEY", "") or os.getenv("FAL_KEY", "")
    key_configured = bool(fal_key and len(fal_key.strip()) > 0)
    print(f"\n[1] fal.ai Credentials Status:")
    print(f"    - FAL_KEY configured: {key_configured}")
    if key_configured:
        print(f"    - Key length: {len(fal_key)} chars (prefix: {fal_key[:4]}***)")
    else:
        print("    - Key status: MISSING (Please configure FAL_KEY in .env before running --live)")

    # 2. Inspect Benchmark Assets
    print(f"\n[2] Verifying Benchmark Assets:")
    try:
        person_info = inspect_asset(BENCHMARK_PERSON, "Person Portrait Model")
        print(f"    [OK] Person Model:    {person_info['dimensions']} px ({person_info['size_kb']} KB) - {person_info['path']}")

        saree_info = inspect_asset(BENCHMARK_SAREE, "Indian Kanchipuram Silk Saree")
        print(f"    [OK] Saree Asset:     {saree_info['dimensions']} px ({saree_info['size_kb']} KB) - {saree_info['path']}")

        western_info = inspect_asset(BENCHMARK_WESTERN, "Western Chambray Shirt (M-SHIRT-006)")
        print(f"    [OK] Western Asset:   {western_info['dimensions']} px ({western_info['size_kb']} KB) - {western_info['path']}")
        print("         (Note: File 'm-dhoti-006.jpg' contains the Tailored Chambray Shirt image matching catalog SKU M-SHIRT-006)")
    except Exception as e:
        print(f"    [X] Asset inspection error: {e}")
        return False

    # 3. Model Configurations and Endpoints
    print(f"\n[3] Candidate Models & Endpoints:")
    fashn_engine = CloudApiTryOnEngine(provider_name="fal-fashn", api_key="dummy_for_dry_run")
    kolors_engine = CloudApiTryOnEngine(provider_name="fal-kolors", api_key="dummy_for_dry_run")

    print(f"    Candidate A: FASHN v1.6")
    print(f"      - Endpoint:    {fashn_engine.api_url}")
    print(f"      - Cost/Run:    ${fashn_engine._get_estimated_cost():.3f} USD")
    print(f"      - Auth Header: Key <FAL_KEY>")

    print(f"    Candidate B: Kling Kolors Virtual Try-On v1.5")
    print(f"      - Endpoint:    {kolors_engine.api_url}")
    print(f"      - Cost/Run:    ${kolors_engine._get_estimated_cost():.3f} USD")
    print(f"      - Auth Header: Key <FAL_KEY>")

    # 4. Payload Dry-Run Construction
    print(f"\n[4] Validating Payload Construction:")
    with open(BENCHMARK_PERSON, "rb") as pf, open(BENCHMARK_SAREE, "rb") as sf, open(BENCHMARK_WESTERN, "rb") as wf:
        p_bytes = pf.read()
        s_bytes = sf.read()
        w_bytes = wf.read()

    # FASHN Saree
    p_fashn_saree = fashn_engine._prepare_payload(
        p_bytes, s_bytes, {"category": "Bridal Silk", "name_en": "Kanchipuram Silk Saree"}
    )
    print(f"    [OK] FASHN Saree Payload: category='{p_fashn_saree['category']}', mode='{p_fashn_saree['mode']}'")

    # Kolors Saree
    p_kolors_saree = kolors_engine._prepare_payload(
        p_bytes, s_bytes, {"category": "Bridal Silk", "name_en": "Kanchipuram Silk Saree"}
    )
    print(f"    [OK] Kolors Saree Payload: human_image_url length={len(p_kolors_saree['human_image_url'])}, garment_image_url length={len(p_kolors_saree['garment_image_url'])}")

    # FASHN Western
    p_fashn_western = fashn_engine._prepare_payload(
        p_bytes, w_bytes, {"category": "Men Shirts", "name_en": "Indigo Chambray Cotton Shirt"}
    )
    print(f"    [OK] FASHN Western Payload: category='{p_fashn_western['category']}'")

    # Kolors Western
    p_kolors_western = kolors_engine._prepare_payload(
        p_bytes, w_bytes, {"category": "Men Shirts", "name_en": "Indigo Chambray Cotton Shirt"}
    )
    print(f"    [OK] Kolors Western Payload: human_image_url length={len(p_kolors_western['human_image_url'])}")

    # 5. Cost and Safety Summary
    total_estimated_cost = (fashn_engine._get_estimated_cost() * 2) + (kolors_engine._get_estimated_cost() * 2)
    print(f"\n[5] Cost Estimate for Live Shootout:")
    print(f"    - FASHN v1.6 (2 runs):       ${fashn_engine._get_estimated_cost() * 2:.3f} USD")
    print(f"    - Kling Kolors v1.5 (2 runs): ${kolors_engine._get_estimated_cost() * 2:.3f} USD")
    print(f"    - Total Estimated Cost:      ${total_estimated_cost:.3f} USD (~Rs 24.00 INR)")

    print("\n" + "=" * 75)
    print(" [OK] DRY-RUN SUCCESSFUL: All input assets, configurations & payloads verified.")
    print("      ZERO external API requests were made. ZERO credits were spent.")
    print("      To execute live benchmark after adding FAL_KEY to .env, run:")
    print("        backend\\venv\\Scripts\\python.exe backend/run_fal_shootout.py --live")
    print("=" * 75 + "\n")
    return True


async def run_live():
    print("\n" + "=" * 75)
    print(" NeXooAi fal.ai Benchmark Shootout — LIVE EXECUTION")
    print("=" * 75)

    fal_key = getattr(settings, "FAL_KEY", "") or os.getenv("FAL_KEY", "")
    if not fal_key or len(fal_key.strip()) == 0:
        print("\n[ERROR] FAL_KEY is not configured in .env or system environment!")
        print("Please add 'FAL_KEY=your_key' to .env before running --live.")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(BENCHMARK_PERSON, "rb") as pf, open(BENCHMARK_SAREE, "rb") as sf, open(BENCHMARK_WESTERN, "rb") as wf:
        p_bytes = pf.read()
        s_bytes = sf.read()
        w_bytes = wf.read()

    test_runs = [
        {
            "id": "fashn_kanchipuram_saree",
            "provider": "fal-fashn",
            "garment_label": "Kanchipuram Silk Saree",
            "garment_bytes": s_bytes,
            "options": {"category": "Bridal Silk", "name_en": "Kanchipuram Pure Silk Bridal Saree"},
        },
        {
            "id": "kolors_kanchipuram_saree",
            "provider": "fal-kolors",
            "garment_label": "Kanchipuram Silk Saree",
            "garment_bytes": s_bytes,
            "options": {"category": "Bridal Silk", "name_en": "Kanchipuram Pure Silk Bridal Saree"},
        },
        {
            "id": "fashn_western_shirt",
            "provider": "fal-fashn",
            "garment_label": "Chambray Western Shirt",
            "garment_bytes": w_bytes,
            "options": {"category": "Men Shirts", "name_en": "Tailored Indigo Chambray Cotton Shirt"},
        },
        {
            "id": "kolors_western_shirt",
            "provider": "fal-kolors",
            "garment_label": "Chambray Western Shirt",
            "garment_bytes": w_bytes,
            "options": {"category": "Men Shirts", "name_en": "Tailored Indigo Chambray Cotton Shirt"},
        },
    ]

    results_summary = []

    for test in test_runs:
        print(f"\n[Executing] Model: {test['provider']} | Garment: {test['garment_label']}...")
        engine = CloudApiTryOnEngine(provider_name=test["provider"], api_key=fal_key)
        start_t = time.time()

        res = await engine.process_tryon(p_bytes, test["garment_bytes"], test["options"])
        elapsed_sec = round(time.time() - start_t, 2)

        output_filename = f"{test['id']}.jpg"
        output_path = OUTPUT_DIR / output_filename

        record = {
            "run_id": test["id"],
            "provider": test["provider"],
            "garment": test["garment_label"],
            "status": res.status,
            "duration_sec": elapsed_sec,
            "cost_usd": res.estimated_cost_usd,
            "provider_job_id": res.provider_job_id,
            "error_code": res.error_code,
            "error_message": res.error_message,
            "saved_file": str(output_path) if res.status == "completed" else None,
        }

        if res.status == "completed" and res.result_image_bytes:
            with open(output_path, "wb") as out_f:
                out_f.write(res.result_image_bytes)
            print(f"  [OK] SUCCESS in {elapsed_sec}s (${res.estimated_cost_usd:.3f}) -> Saved: {output_path}")
        else:
            print(f"  [X] FAILED in {elapsed_sec}s: [{res.error_code}] {res.error_message}")

        results_summary.append(record)

    summary_file = OUTPUT_DIR / "benchmark_summary.json"
    with open(summary_file, "w") as sf:
        json.dump(
            {
                "timestamp": datetime.utcnow().isoformat(),
                "runs": results_summary,
            },
            sf,
            indent=2,
        )

    print("\n" + "=" * 75)
    print(" LIVE BENCHMARK COMPLETE - Summary:")
    print("=" * 75)
    for r in results_summary:
        print(f"  * {r['run_id']:30} | Status: {r['status']:10} | Time: {r['duration_sec']}s | Cost: ${r['cost_usd']:.3f}")
    print(f"\nMetadata saved to: {summary_file}")
    print("=" * 75 + "\n")


def main():
    parser = argparse.ArgumentParser(description="NeXooAi fal.ai Model Shootout Benchmark")
    parser.add_argument(
        "--live",
        action="store_true",
        help="Execute live fal.ai requests (Requires FAL_KEY and consumes credits)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate configurations and payloads without network requests (Safe, Default)",
    )

    args = parser.parse_args()

    if args.live:
        asyncio.run(run_live())
    else:
        run_dry_run()


if __name__ == "__main__":
    main()
