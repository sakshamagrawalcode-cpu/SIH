from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..db import get_conn

router = APIRouter(prefix="/api/documents", tags=["documents"])

# Cap stored data-URL size so the demo DB stays small (~2MB base64).
MAX_DATA_URL_LEN = 2_800_000


class DocumentUpload(BaseModel):
    phone: str | None = None
    case_id: str | None = None
    doc_type: str
    filename: str
    content_type: str
    data_url: str


@router.post("")
def upload_document(req: DocumentUpload):
    if len(req.data_url) > MAX_DATA_URL_LEN:
        raise HTTPException(413, "File too large for demo storage (max ~2MB).")
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO documents (case_id, phone, doc_type, filename, content_type, data_url)
               VALUES (?,?,?,?,?,?)""",
            (req.case_id, req.phone, req.doc_type, req.filename, req.content_type, req.data_url),
        )
        conn.commit()
        row = conn.execute("SELECT id FROM documents ORDER BY id DESC LIMIT 1").fetchone()
    return {"id": row["id"], "filename": req.filename, "doc_type": req.doc_type}


def _row_to_doc(row, include_data=False) -> dict:
    doc = {
        "id": row["id"],
        "case_id": row["case_id"],
        "phone": row["phone"],
        "doc_type": row["doc_type"],
        "filename": row["filename"],
        "content_type": row["content_type"],
        "uploaded_at": row["uploaded_at"],
    }
    if include_data:
        doc["data_url"] = row["data_url"]
    return doc


@router.get("")
def list_documents(phone: str | None = None, case_id: str | None = None):
    with get_conn() as conn:
        if case_id:
            rows = conn.execute("SELECT * FROM documents WHERE case_id=? ORDER BY id DESC", (case_id,)).fetchall()
        elif phone:
            rows = conn.execute("SELECT * FROM documents WHERE phone=? ORDER BY id DESC", (phone,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM documents ORDER BY id DESC").fetchall()
    return {"documents": [_row_to_doc(r) for r in rows]}


@router.get("/{doc_id}")
def get_document(doc_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM documents WHERE id=?", (doc_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Document not found")
    return _row_to_doc(row, include_data=True)


@router.delete("/{doc_id}")
def delete_document(doc_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM documents WHERE id=?", (doc_id,))
        conn.commit()
    return {"deleted": doc_id}
