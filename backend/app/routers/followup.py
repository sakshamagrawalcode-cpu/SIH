from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..db import get_conn, add_case_history

router = APIRouter(prefix="/api/followup", tags=["followup"])


@router.get("/{case_id}")
def get_followups(case_id: str):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM followups WHERE case_id=? ORDER BY id ASC", (case_id,)
        ).fetchall()
    if not rows:
        raise HTTPException(404, "No follow-up records for this case")
    return {
        "case_id": case_id,
        "milestones": [
            {
                "milestone": r["milestone"],
                "status": r["status"],
                "outcome": r["outcome"],
                "note": r["note"],
                "earning_monthly": r["earning_monthly"],
                "updated_at": r["updated_at"],
            }
            for r in rows
        ],
    }


class FollowupUpdateRequest(BaseModel):
    status: str
    outcome: str | None = None
    note: str | None = None
    earning_monthly: int | None = None


@router.post("/{case_id}/{milestone}")
def update_followup(case_id: str, milestone: str, req: FollowupUpdateRequest):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM followups WHERE case_id=? AND milestone=?", (case_id, milestone)
        ).fetchone()
        if not row:
            raise HTTPException(404, "Follow-up milestone not found")
        conn.execute(
            "UPDATE followups SET status=?, outcome=?, note=?, earning_monthly=?, updated_at=CURRENT_TIMESTAMP WHERE case_id=? AND milestone=?",
            (req.status, req.outcome, req.note, req.earning_monthly, case_id, milestone),
        )
        add_case_history(conn, case_id, f"followup_{milestone}",
                         f"{milestone}: {req.outcome or req.status}" + (f" (₹{req.earning_monthly}/mo)" if req.earning_monthly else ""))
        conn.commit()
    return {"case_id": case_id, "milestone": milestone, "status": req.status, "outcome": req.outcome}
