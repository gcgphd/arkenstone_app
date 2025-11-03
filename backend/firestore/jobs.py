# firestore_utils.py
from app import db
from google.cloud import firestore

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


def jobs_get(db, job_id: str, uid : str, data: dict):
    """Return the job document as a dict, or None if missing."""
    doc = db.collection(COLLECTION).document(uid).collection("jobs").document(job_id).get()
    return doc.to_dict() if doc.exists else None
