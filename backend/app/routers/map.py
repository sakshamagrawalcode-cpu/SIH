from fastapi import APIRouter
from ..db import get_conn

router = APIRouter(prefix="/api/map", tags=["map"])

# Sample/demo block coordinates only - illustrative, not real administrative data.
BLOCKS = [
    {"block": "Rampur Block", "lat": 26.4499, "lng": 80.3319, "demo_demand": {
        "Two/Three Wheeler Mechanic": 34, "Plumber (General)": 18, "Mason (Building)": 21,
        "Field Crop Farm Worker": 40,
    }},
    {"block": "Sultanpur Block", "lat": 26.2647, "lng": 82.0721, "demo_demand": {
        "Tailor (Ready-made Garments)": 29, "Embroiderer": 15, "Cook (Domestic/Small Establishment)": 12,
    }},
    {"block": "Bhairahatta Block", "lat": 26.7900, "lng": 80.8900, "demo_demand": {
        "Auto Electrician": 11, "Mason (Building)": 17, "Two/Three Wheeler Mechanic": 9,
    }},
]


@router.get("")
def demand_map():
    with get_conn() as conn:
        rows = conn.execute("SELECT location, occupation FROM cases").fetchall()
    live_counts: dict[str, dict[str, int]] = {}
    for r in rows:
        block = r["location"]
        occ = r["occupation"]
        live_counts.setdefault(block, {}).setdefault(occ, 0)
        live_counts[block][occ] += 1

    result = []
    for b in BLOCKS:
        demand = dict(b["demo_demand"])
        for occ, count in live_counts.get(b["block"], {}).items():
            demand[occ] = demand.get(occ, 0) + count
        total = sum(demand.values())
        result.append({
            "block": b["block"], "lat": b["lat"], "lng": b["lng"],
            "demand": demand, "total": total,
        })
    return {"blocks": result, "note": "Demo/sample demand data - illustrative only, not official statistics."}
