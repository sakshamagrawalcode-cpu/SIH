from fastapi import APIRouter
from ..db import get_conn

router = APIRouter(prefix="/api/map", tags=["map"])

# Sample/demo block coordinates only (Ahmedabad district, Gujarat) -
# illustrative, not real administrative or statistical data.
BLOCKS = [
    {"block": "Dholka Block", "lat": 22.7286, "lng": 72.4419, "demo_demand": {
        "Two/Three Wheeler Mechanic": 34, "Plumber (General)": 18, "Mason (Building)": 21,
        "Field Crop Farm Worker": 40,
    }},
    {"block": "Sanand Block", "lat": 22.9880, "lng": 72.3820, "demo_demand": {
        "Tailor (Ready-made Garments)": 29, "Embroiderer": 15, "Cook (Domestic/Small Establishment)": 12,
    }},
    {"block": "Bavla Block", "lat": 22.8340, "lng": 72.3670, "demo_demand": {
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
    return {"blocks": result, "note": "Demo/sample demand data (Ahmedabad district) - illustrative only, not official statistics."}
