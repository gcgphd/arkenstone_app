# app.py
from app import app  # keep your existing import
from app import storage_client

from uuid import uuid4
from flask import request, jsonify
from werkzeug.utils import secure_filename
from gcs import upload_bytes_signed

ALLOWED = {"png", "jpg", "jpeg", "webp"}
def allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED


@app.post("/upload_image_to_gcs_signed")
def upload_image_to_gcs_signed():
    if "file" not in request.files:
        return jsonify({"error": "missing 'file'"}), 400

    f = request.files["file"]
    if not f.filename or not allowed(f.filename):
        return jsonify({"error": "empty filename or not allowed"}), 400

    raw = f.read()
    if not raw:
        return jsonify({"error": "empty file content"}), 400

    safe_name = f"{uuid4().hex}_{secure_filename(f.filename)}"
    info = upload_bytes_signed(
        storage_client,
        raw, 
        safe_name, 
        f.mimetype or "application/octet-stream"
    )


    return jsonify({
        "ok": True,
        "filename": safe_name,
        "size": len(raw),
        "mimetype": f.mimetype,
        "url": info["signed_url"],   # <— time-limited public link for preview
        "thumbUrl": info["signed_url"],
        "gcs_path": info["gcs_path"],
        "cdn": "gcs-signed"
    }), 200



@app.post("/upload_image_to_gcs_signed_tmp")
def upload_image_to_gcs_signed_tmp():
    
    if "file" not in request.files:
        return jsonify({"error": "missing 'file'"}), 400
    
    uid = request.form.get("uid")
    if not uid:
        return jsonify({"error": "Missing uid"}), 400

    tmp_path = f'tmp/uploads/users/{uid}'

    f = request.files["file"]
    if not f.filename or not allowed(f.filename):
        return jsonify({"error": "empty filename or not allowed"}), 400

    raw = f.read()
    if not raw:
        return jsonify({"error": "empty file content"}), 400

    safe_name = f"{uuid4().hex}_{secure_filename(f.filename)}"
    
    info = upload_bytes_signed(
        storage_client,
        file_bytes =raw, 
        gcs_path= tmp_path,
        filename= safe_name,
        content_type= f.mimetype or "application/octet-stream"
    )


    return jsonify({
        "ok": True,
        "filename": safe_name,
        "size": len(raw),
        "mimetype": f.mimetype,
        "url": info["signed_url"], 
        "thumbUrl": info["signed_url"],
        "gcs_path": info["gcs_path"],
        "cdn": "gcs-signed"
    }), 200







