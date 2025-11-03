# app.py

from app import app  # keep your existing import

import os
from uuid import uuid4
from flask import request, jsonify, send_from_directory
from werkzeug.utils import secure_filename


# ----------------------------
# Config & setup
# ----------------------------
UPLOAD_DIR = app.config['UPLOAD_DIR']  # e.g. "./uploads" (local) or "/tmp/uploads" (Cloud Run)
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED = {"png", "jpg", "jpeg", "webp"}

def allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED


# ----------------------------
# upload endpoint
# ----------------------------
@app.post("/upload_image_to_dir")
def upload_image_to_dir():
    if "file" not in request.files:
        return jsonify({"error": "missing 'file' field"}), 400

    f = request.files["file"]
    if f.filename == "":
        return jsonify({"error": "empty filename"}), 400
    if not allowed(f.filename):
        return jsonify({"error": "file type not allowed"}), 400

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

# ----------------------------
# serve uploads (dev only)
# ----------------------------
@app.get("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(UPLOAD_DIR, filename)



