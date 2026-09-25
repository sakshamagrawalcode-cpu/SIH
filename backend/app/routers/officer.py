from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..db import get_conn
from .cases import _row_to_case

router = APIRouter(prefix="/api/officer", tags=["officer"])


@router.get("/cases")
def list_cases(status: str | None = None):
    with get_conn() as conn:
        if status:
            rows = conn.execute("SELECT * FROM cases WHERE status=? ORDER BY created_at DESC", (status,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM cases ORDER BY created_at DESC").fetchall()
    return {"cases": [_row_to_case(r) for r in rows]}


class ActionRequest(BaseModel):
    note: str | None = None


@router.post("/cases/{case_id}/approve")
def approve_case(case_id: str, req: ActionRequest):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM cases WHERE case_id=?", (case_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Case not found")
        conn.execute("UPDATE cases SET status=?, officer_note=? WHERE case_id=?", ("approved", req.note, case_id))
        conn.commit()
    return {"case_id": case_id, "status": "approved"}


@router.post("/cases/{case_id}/clarify")
def request_clarification(case_id: str, req: ActionRequest):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM cases WHERE case_id=?", (case_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Case not found")
        conn.execute("UPDATE cases SET status=?, officer_note=? WHERE case_id=?", ("clarification_requested", req.note, case_id))
        conn.commit()
    return {"case_id": case_id, "status": "clarification_requested"}
