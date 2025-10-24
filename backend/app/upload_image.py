# app.py
import os
from app import app
from uuid import uuid4
from flask import request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

# choose a writable directory
# in local dev: ./uploads
# in Cloud Run or read-only containers: use /tmp/uploads
UPLOAD_DIR = app.config['UPLOAD_DIR']
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED = {"png", "jpg", "jpeg", "gif", "webp", "pdf"}

def allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED

@app.post("/upload_image_to_dir")
def upload_image_to_dir():
    if "file" not in request.files:
        return jsonify({"error": "missing 'file' field"}), 400

    f = request.files["file"]
    if f.filename == "":
        return jsonify({"error": "empty filename"}), 400
    if not allowed(f.filename):
        return jsonify({"error": "file type not allowed"}), 400

    ext = f.filename.rsplit(".", 1)[1].lower()
    fname = f"{uuid4().hex}_{secure_filename(f.filename)}"
    path = os.path.join(UPLOAD_DIR, fname)

    # save to disk
    f.save(path)

    # return a preview URL
    return jsonify({
        "ok": True,
        "filename": fname,
        "url": f"/uploads/{fname}"
    }), 200

# serve uploaded files - dev only
@app.get("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)