# firestore_utils.py
from google.cloud import firestore

# Firestore client (will use emulator if FIRESTORE_EMULATOR_HOST is set)
db = firestore.Client()

COLLECTION = "users"

def jobs_set(job_id: str, uid : str, data: dict):
    
    print(job_id,uid,data)
    
    """Create a new job document."""
    data = {
        **data,
        "created_at": firestore.SERVER_TIMESTAMP,
        "modified_at": firestore.SERVER_TIMESTAMP,
    }
    db.collection(COLLECTION).document(uid).collection("jobs").document(job_id).set(data)
    

def jobs_update(job_id: str, data: dict):
    """Update fields in an existing job document."""
    data = {
        **data,
        "modified_at": firestore.SERVER_TIMESTAMP,
    }
    db.collection(COLLECTION).document(job_id).update(data)

def jobs_get(job_id: str):
    """Return the job document as a dict, or None if missing."""
    doc = db.collection(COLLECTION).document(job_id).get()
    return doc.to_dict() if doc.exists else None
