# firestore_utils.py
from app import db
from datetime import datetime
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from typing import Dict, Optional, Any,  Iterable, List

COLLECTION = "users"

def jobs_set(db, job_id: str, uid : str, data: dict):
    print(job_id)
    """Create a new job document."""
    data = {
        **data,
        "created_at": firestore.SERVER_TIMESTAMP,
        "modified_at": firestore.SERVER_TIMESTAMP,
    }
    db.collection(COLLECTION).document(uid).collection("jobs").document(job_id).set(data)
    

def jobs_update(db, job_id: str, uid : str, data: dict):
    """Update fields in an existing job document."""
    data = {
        **data,
        "modified_at": firestore.SERVER_TIMESTAMP,
    }
    db.collection(COLLECTION).document(uid).collection("jobs").document(job_id).update(data)


def jobs_get(db, job_id: str, uid : str):
    """Return the job document as a dict, or None if missing."""
    doc = db.collection(COLLECTION).document(uid).collection("jobs").document(job_id).get()
    return doc.to_dict() if doc.exists else None


def jobs_get_all(
    db,
    uid: str,
    *,
    status: Optional[str] = None,
    order_by: Optional[str] = "created_at",
    descending: bool = True,
    limit: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """
    Return all job documents for a user as {job_id: job_dict}, or None if none exist.

    Optional filters:
      - status: filter by exact status value
      - order_by: field name to order by (default 'created_at')
      - descending: sort direction
      - limit: max number of jobs to return
    """
    jobs_ref = db.collection(COLLECTION).document(uid).collection("jobs")
    q = jobs_ref

    if status is not None:
        q = q.where("status", "==", status)

    if order_by:
        direction = firestore.Query.DESCENDING if descending else firestore.Query.ASCENDING
        q = q.order_by(order_by, direction=direction)

    if limit is not None:
        q = q.limit(int(limit))

    docs = list(q.stream())
    if not docs:
        return None

    # Map job_id -> job_data, also inject the id into each dict for convenience
    out: Dict[str, Any] = {}
    for d in docs:
        data = d.to_dict() or {}
        if "job_id" not in data:
            data["job_id"] = d.id
        out[d.id] = data

    return out



##### Delete job functions

def _chunks(seq: List[str], size: int) -> Iterable[List[str]]:
    for i in range(0, len(seq), size):
        yield seq[i:i+size]

def jobs_delete_all(
    db,
    uid: str,
    *,
    status: Optional[str] = None,
    order_by: Optional[str] = "created_at",
    descending: bool = True,
    limit: Optional[int] = None,
    created_before: Optional[datetime] = None,
    created_after: Optional[datetime] = None,
    dry_run: bool = False,
    force: bool = False,
) -> Dict[str, Any]:
    """
    Delete user job documents that match filters. Returns a summary:
      {
        "dry_run": bool,
        "attempted_count": int,
        "deleted_count": int,
        "ids": [..]
      }

    Safety:
      - If no filters AND no limit are provided, you must pass force=True,
        otherwise the function refuses to delete.

    Filters (same spirit as jobs_get_all):
      - status: exact match on "status"
      - order_by: field name to order by (used only if 'limit' is set, or for deterministic selection)
      - descending: sort direction for 'order_by'
      - limit: max number of jobs to consider for deletion
      - created_before / created_after: compare against a timestamp field (default assumes 'created_at')

    Notes:
      - Deletion is done in batches of ≤500 writes per Firestore limits.
      - If dry_run=True, nothing is deleted; only the matching IDs are returned.
    """
    jobs_ref = db.collection(COLLECTION).document(uid).collection("jobs")

    # Build query
    q = jobs_ref
    if status is not None:
        q = q.where("status", "==", status)

    # With:
    if created_after is not None:
        q = q.where(filter=FieldFilter("created_at", ">", created_after))
    if created_before is not None:
        q = q.where(filter=FieldFilter("created_at", "<", created_before))

    if order_by:
        direction = firestore.Query.DESCENDING if descending else firestore.Query.ASCENDING
        q = q.order_by(order_by, direction=direction)

    if limit is not None:
        q = q.limit(int(limit))

    # Safety guard: avoid accidental full wipe
    if not force and status is None and created_before is None and created_after is None and limit is None:
        return {
            "dry_run": dry_run,
            "attempted_count": 0,
            "deleted_count": 0,
            "ids": [],
            "warning": "Refused: no filters and no limit. Pass force=True to delete all."
        }

    docs = list(q.stream())
    ids_to_delete = [d.id for d in docs]

    if dry_run or not ids_to_delete:
        return {
            "dry_run": True if dry_run else False,
            "attempted_count": len(ids_to_delete),
            "deleted_count": 0,
            "ids": ids_to_delete,
        }

    # Delete in batches of 500
    deleted_count = 0
    for batch_ids in _chunks(ids_to_delete, 500):
        batch = db.batch()
        for doc_id in batch_ids:
            batch.delete(jobs_ref.document(doc_id))
        batch.commit()
        deleted_count += len(batch_ids)

    return {
        "dry_run": False,
        "attempted_count": len(ids_to_delete),
        "deleted_count": deleted_count,
        "ids": ids_to_delete,
    }
