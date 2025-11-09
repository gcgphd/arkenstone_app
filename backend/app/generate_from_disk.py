# app.py
import os
from uuid import uuid4
from datetime import datetime
from flask import request, jsonify
from app import app  # keep your existing import
from jobs import run_nano_banana_job,run_sync_nano_banana_job
from firestore import jobs_set,jobs_get,jobs_get_all,jobs_delete_all
from queue_manager import enqueue
from .collect_media import collect_media,_safe_upload_disk_path,_to_abs_url
from prompts import dress_prompt,background_prompt
from gcs import get_signed_url,delete_gcs_folder,copy_blob_within_bucket

from app import db,storage_client


def prepare_job(data,jobid):
    """
    Accepts the JSON payload built on the frontend and optionally triggers a Replicate job.
    """

    out = {}
    gallery_out = []
    file_inputs = []

    uid = data.get('uid')
    preview = data.get("preview")
    gallery = data.get("gallery")

    dest_gcs_folder = f'user/{uid}/jobs/{jobid}'

    if not isinstance(preview, dict):
        raise Exception("'preview' must be an object")
    if not isinstance(gallery, list):
        raise Exception("'gallery' must be an object")

    preview_url = preview.get("url")
    if not preview_url or not isinstance(preview_url,str):
        raise Exception("missing 'preview.url'")
    
    preview_gcs_path = preview.get('gcs_path')
    if not preview_gcs_path or not isinstance(preview_gcs_path,str):
        raise Exception('impossible to locate preview on storage disk.')
    

    #important: copy files from the tmp folder
    #to the job folder
    dest_gcs_path = copy_blob_within_bucket(
        client= storage_client,
        blob_name= preview_gcs_path,
        new_folder= f'{dest_gcs_folder}/preview'
    )

    signed = get_signed_url(
        client=storage_client,
        gcs_path=dest_gcs_path
    )

  
    # prepare the output for preview
    file_inputs.append(preview_url)
    
    out['preview'] = {
        'filename':preview.get('filename'),
        'mimetype':preview.get('mimetype'),
        'size':preview.get('size'),
        'gcs_path': dest_gcs_path,
        'signed_url':signed.get('signed_url')
    }
    
    for gallery_item in gallery:

        if not isinstance(gallery_item, dict):
            raise Exception("'gallery_item' must be an object")
        
        gallery_item_url = gallery_item.get("url")
        gallery_item_gcs_path = gallery_item.get("gcs_path")

        # important: copy files from the tmp folder
        # to the job folder
        dest_gcs_path = copy_blob_within_bucket(
            client= storage_client,
            blob_name= gallery_item_gcs_path,
            new_folder= f'{dest_gcs_folder}/gallery'
        )

        signed = get_signed_url(
            client=storage_client,
            gcs_path=dest_gcs_path
        )


        # prepare the output for gallery
        file_inputs.append(gallery_item_url)

        gallery_out.append({
            'filename':gallery_item.get('filename'),
            'mimetype':gallery_item.get('mimetype'),
            'size':gallery_item.get('size'),
            'gcs_path': dest_gcs_path,
            'signed_url':signed.get('signed_url')
        })
    
    out["gallery"] = gallery_out
    out['job_id'] = jobid
    out['status'] = 'running'

    return {'file_inputs':file_inputs,'db_entry':out}


@app.post("/queue_generation_job_test")
def queue_generation_job_test():
    
    # collect data
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "invalid or missing JSON body"}), 400
    
    # collect user id
    uid = data.get('uid')
    if uid is None:
        return jsonify({"error": "Missing uid"}), 400
    
    # prepare the job
    job_id = str(uuid4())

    # - collect the media from gallery
    # - move file from tmp to userdir
    # - prepare an entry for the database
    try:
        media = prepare_job(data,job_id)
    except Exception as e:
        # cleanup the jobid folder if created
        delete_gcs_folder(
            storage_client, 
            folder_path= f'user/{uid}/jobs/{job_id}'
        )
        return jsonify({'error':repr(e)}),400

    file_inputs = media.get('file_inputs')
    db_entry = media.get('db_entry')

    if not file_inputs:
        return jsonify({'error':'No Files To process'}),400

    # set the job status in firebase
    jobs_set(db, job_id= job_id, uid= uid, data= db_entry) 
    
    # start the job
    enqueue(run_nano_banana_job, db=db, job_id=job_id, uid=uid, media=file_inputs, prompt=dress_prompt)

    return jsonify({"ok": True, "job_id": job_id, "status": "running"}), 202


@app.post("/send_generation_job")
def send_generation_job():
    
    # collect data
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "invalid or missing JSON body"}), 400
    
    # collect user id
    uid = data.get('uid')
    if uid is None:
        return jsonify({"error": "Missing uid"}), 400
    
    # prepare the job
    job_id = str(uuid4())

    file_inputs = data.get('file_inputs')
    if not file_inputs:
        return jsonify({'error':'No Files To process'}),400
    
    # start the generation job
    result = run_sync_nano_banana_job(job_id=job_id, uid=uid, media=file_inputs, prompt=background_prompt)
    
    if result.get("status") == "succeeded":
        return jsonify(result),200
    
    return jsonify(result),400


@app.post("/queue_generation_job")
def queue_generation_job():
    
    # collect data
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "invalid or missing JSON body"}), 400
    
    # collect user id
    uid = data.get('uid')
    if uid is None:
        return jsonify({"error": "Missing uid"}), 400

    # collect the media from gallery
    try:
        media = collect_media(data)
    except Exception as e:
        return jsonify({'error':repr(e)}),400

    file_inputs = media.get('file_inputs')
    file_inputs.reverse()
    preview_url = media.get('preview_url')
    items = media.get('items')

    if not file_inputs:
        return jsonify({'error':'No Files To process'}),400

    # start a job
    job_id = str(uuid4())
   
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
    


ALLOWED_ORDER_FIELDS = {"created_at", "modified_at", "status"}  # adjust to your schema

def _parse_bool(val, default):
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "t", "yes", "y")

def _parse_int(val):
    if val is None or val == "":
        return None
    try:
        return int(val)
    except ValueError:
        return None
    

def sign_job_images(jobs):
    '''
    Add a 'signed_url' key to all
    images in a job list coming from
    firestore database
    '''

    for job in jobs.values():
        for section in ("preview", "results", "gallery"):
            data = job.get(section)
            items = data if isinstance(data, list) else [data] if isinstance(data, dict) else []
            
            for obj in items:
                if obj and "gcs_path" in obj:
                    signed_response = get_signed_url(storage_client, obj["gcs_path"])
                    obj["signed_url"] = signed_response['signed_url']

    return


@app.route("/jobs", methods=["GET"])
def get_all_jobs():
    """
    GET /jobs?uid=<user_id>&status=<succeeded|failed|...>&order_by=<created_at|modified_at|status>&descending=<true|false>&limit=<int>
    Returns all jobs for the given user as JSON.
    """
    uid = request.args.get("uid")
    if not uid:
        return jsonify({"error": "Missing uid"}), 400

    # optional filters
    status = request.args.get("status")  # exact match (single value)
    order_by = request.args.get("order_by", "modified_at")
    if order_by not in ALLOWED_ORDER_FIELDS:
        order_by = "modified_at"

    descending = _parse_bool(request.args.get("descending"), True)
    limit = _parse_int(request.args.get("limit"))

    try:
        jobs = jobs_get_all(
            db,
            uid,
            status=status,
            order_by=order_by,
            descending=descending,
            limit=limit,
        )

        # need to create a signed url for each 
        # image element in results
        sign_job_images(jobs)

        # jobs is a dict {"job_id":{data}} transform to list
        items = list(jobs.values()) if jobs else []
        return jsonify({"jobs": items}), 200
    
    except Exception as e:
        print(e)
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