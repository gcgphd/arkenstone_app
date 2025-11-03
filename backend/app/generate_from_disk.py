# app.py
import os
from uuid import uuid4
from urllib.parse import urlparse
from flask import request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from app import app  # keep your existing import
from jobs import generate_nano_banana,run_nano_banana_job
from typing import Optional
from replicate_api import get_replicate_client
from firestore import jobs_set
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
    file_inputs.reverse()
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

    enqueue(run_nano_banana_job, db=db, job_id=job_id, uid=uid, media=file_inputs, prompt=dress_prompt)

    return jsonify({"ok": True, "job_id": job_id, "status": "queued"}), 202