# app.py
import os
from uuid import uuid4
from datetime import datetime
from flask import request, jsonify
from app import app  # keep your existing import
from jobs import generate_nano_banana,run_nano_banana_job
from firestore import jobs_set,jobs_get,jobs_get_all,jobs_delete_all
from queue_manager import enqueue
from .collect_media import collect_media,_safe_upload_disk_path,_to_abs_url
from prompts import dress_prompt

from app import db

# ----------------------------
# Config & setup
# ----------------------------
UPLOAD_DIR = app.config['UPLOAD_DIR']  # e.g. "./uploads" (local) or "/tmp/uploads" (Cloud Run)
os.makedirs(UPLOAD_DIR, exist_ok=True)



# ----------------------------
# generate endpoint
# ----------------------------
@app.post("/generate_from_disk")
def generate_from_disk():
    """
    Accepts the JSON payload built on the frontend and optionally triggers a Replicate job.
    """

    # collect the media from gallery
    try:
        media = collect_media(request)
    except Exception as e:
        return jsonify({'error':repr(e)}),400
    

    file_inputs = media.get('file_inputs')
    preview_url = media.get('preview_url')
    items = media.get('items')


    # start the generation block
    if not file_inputs:
        replicate_block = {"count": 0, "items": []}
    
    else:
        try:
            results = generate_nano_banana(
                image_urls=file_inputs,          
                prompt=dress_prompt,
                aspect_ratio="match_input_image",
                output_format="jpg",
                model_slug="google/nano-banana",
                version=None,
                from_disk=False    
            )



            replicate_items = []
            for jobid, res in results.items():
                replicate_items.append({
                    "jobid": jobid,
                    "prompt": res.get("prompt"),
                    "inputs": res.get("inputs"),
                    "urls": res.get("urls", []),     # remote URLs from Replicate
                    "files": res.get("files", []),   # should be empty since we don't save locally
                    "error": res.get("error"),
                })
            replicate_block = {"count": len(replicate_items), "items": replicate_items}

        except Exception as e:
            replicate_block = {"count": 0, "items": [], "error": repr(e)}

    # Response
    return jsonify({
        "ok": True,
        "preview": {
            "url": {
                "raw": preview_url,
                "absolute": _to_abs_url(preview_url),
                "disk": _safe_upload_disk_path(preview_url),
            }
        },
        "gallery": {"count": len(items), "items": items},
        "replicate": replicate_block
    }), 201



@app.post("/queue_generation_job")
def queue_generation_job():

    # collect the media from gallery
    try:
        media = collect_media(request)
    except Exception as e:
        return jsonify({'error':repr(e)}),400

    file_inputs = media.get('file_inputs')
    preview_url = media.get('preview_url')
    items = media.get('items')

    print(file_inputs)

    if not file_inputs:
        return jsonify({'error':'No Files To process'}),400

    job_id = str(uuid4())
    uid = "Vqcq56PzMGdHdb8eNn3N2SQGO503"
    jobs_set(
        db,
        job_id=job_id,
        uid = uid, 
        data =  {
        "status": "running",
         "preview": {
            "url": {
                "raw": preview_url,
                "absolute": _to_abs_url(preview_url),
                "disk": _safe_upload_disk_path(preview_url),
            }
        },
        "gallery": {"count": len(items), "items": items},
    }) 

    enqueue(run_nano_banana_job, db=db, job_id=job_id, uid=uid, media=file_inputs, prompt=dress_prompt)

    return jsonify({"ok": True, "job_id": job_id, "status": "running"}), 202


@app.route("/job_status", methods=["GET"])
def job_status():
    """
    Example: GET /job_status?job_id=abc123&uid=user001
    Returns JSON like { "ok": true, "job_id": "...", "data": { ... job document ... } }
    """
    job_id = request.args.get("job_id")
    #job_id = 'e0b7edef-32db-46c0-ab85-a8aedd0c9b08'
    uid = request.args.get("uid","Vqcq56PzMGdHdb8eNn3N2SQGO503")

    if not job_id or not uid:
        return jsonify({"ok": False, "error": "Missing job_id or uid"}), 400

    try:
        job_data = jobs_get(db, job_id, uid)
        if not job_data:
            return jsonify({"ok": False, "error": f"Job {job_id} not found"}), 404

        # Optionally include job_id in response
        return jsonify({
            "ok": True,
            "job_id": job_id,
            **job_data
        }), 200

    except Exception as e:
        print(f"Error fetching job {job_id}: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500
    

@app.route("/jobs", methods=["GET"])
def get_all_jobs():
    """
    GET /jobs?uid=<user_id>
    Returns all jobs for the given user as JSON.
    Example: /jobs?uid=abc123
    """
    uid = request.args.get("uid")
    uid = 'Vqcq56PzMGdHdb8eNn3N2SQGO503'
    if not uid:
        return jsonify({"error": "Missing uid"}), 400

    try:
        jobs = jobs_get_all(db, uid)
        return jsonify({"jobs": jobs}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    

@app.route("/jobs", methods=["DELETE"])
def delete_jobs():
    """
    DELETE /jobs?uid=<user_id>&status=<status>&limit=<int>&created_before=<ISO8601>&created_after=<ISO8601>&dry_run=true&force=true

    Deletes all jobs for a given user that match optional filters.
    Returns a summary JSON response.

    Example:
      /jobs?uid=abc123&status=failed&limit=20&dry_run=true
    """
    uid = request.args.get("uid")
    if not uid:
        return jsonify({"error": "Missing uid"}), 400

    # Parse filters
    status = request.args.get("status")
    order_by = request.args.get("order_by", "created_at")
    descending = request.args.get("descending", "true").lower() == "true"
    limit = request.args.get("limit", type=int)
    dry_run = request.args.get("dry_run", "false").lower() == "true"
    force = request.args.get("force", "false").lower() == "true"

    created_before = request.args.get("created_before")
    created_after = request.args.get("created_after")

    # Convert datetime strings (if present)
    def parse_dt(val: str):
        try:
            # allow both ISO and YYYY-MM-DD
            return datetime.fromisoformat(val)
        except Exception:
            return None

    created_before_dt = parse_dt(created_before) if created_before else None
    created_after_dt = parse_dt(created_after) if created_after else None

    try:
        result = jobs_delete_all(
            db,
            uid,
            status=status,
            order_by=order_by,
            descending=descending,
            limit=limit,
            created_before=created_before_dt,
            created_after=created_after_dt,
            dry_run=dry_run,
            force=force,
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500