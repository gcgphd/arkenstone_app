# app.py (API)
from dotenv import load_dotenv
load_dotenv()

import uuid
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import firestore,credentials
from queue_backend import enqueue
from worker_logic import run_nano_banana_job  # the same function used in prod
from collect_media import collect_media,_safe_upload_disk_path,_to_abs_url
from firestore_utils import jobs_set, jobs_get
from prompts import dress_prompt

app = Flask(__name__)

# Configure CORS to allow your frontend domain
CORS(app,origins="http://127.0.0.1:5173", supports_credentials=True)

# # csrf protection
# app.secret_key = b'_gfgfhghf347884748934?!-s1>'
# #csrf = CSRFProtect(app) 

# # csrf protection
# limiter = Limiter(
#     get_remote_address,
#     app=app,
#     default_limits=[
#         "200 per day", 
#         "50 per hour",
#         "5 per second",
#         "20 per minute"
#         ],
#     storage_uri="memory://",
# )



# initialize firebase
with app.app_context():
    fb = firebase_admin.initialize_app() 

@app.post("/test_firebase")
def test_firebase():
    job_id = str(uuid.uuid4())
    uid = "Vqcq56PzMGdHdb8eNn3N2SQGO503"
    
    jobs_set(
        job_id,
        uid,
        {
        "status": "queued",
         "preview": {
            "url": {
                "raw": "ok",
                "absolute": _to_abs_url("ok"),
                "disk": _safe_upload_disk_path("ok"),
            }
        },
        "gallery": {"count": 10, "items": [{"ok":"ok"}]}
        }
        
        ) 

    return jsonify({"ok": True, "job_id": job_id, "status": "queued"}), 202




@app.post("/generate_from_disk")
def generate_from_disk():

    # collect the media from gallery
    try:
        media = collect_media(request)
    except Exception as e:
        return jsonify({'error':repr(e)}),400

    file_inputs = media.get('file_inputs')
    preview_url = media.get('preview_url')
    items = media.get('items')

    if not file_inputs:
        return jsonify({'error':'No Files To process'}),400

    job_id = str(uuid.uuid4())
    jobs_set(job_id, {
        "status": "queued",
         "preview": {
            "url": {
                "raw": preview_url,
                "absolute": _to_abs_url(preview_url),
                "disk": _safe_upload_disk_path(preview_url),
            }
        },
        "gallery": {"count": len(items), "items": items},
    }) 

    enqueue(run_nano_banana_job, job_id=job_id, media=file_inputs, prompt=dress_prompt)

    return jsonify({"ok": True, "job_id": job_id, "status": "queued"}), 202


@app.get("/jobs/<job_id>")
def get_job(job_id):
    doc = jobs_get(job_id)
    if not doc:
        return jsonify({"error": "not found"}), 404
    return jsonify({"job_id": job_id, **doc}), 200


#---------------------------------------------------------
# Localhost run block
# ---------------------------------------------------------
if __name__ == "__main__":
    # Host only on localhost for safety
    app.run(host="127.0.0.1", port=8081, debug=True)


 