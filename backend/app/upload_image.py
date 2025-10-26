# app.py
import os
from uuid import uuid4
from urllib.parse import urlparse
from flask import request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from app import app  # keep your existing import

# ----------------------------
# Config & setup
# ----------------------------
UPLOAD_DIR = app.config['UPLOAD_DIR']  # e.g. "./uploads" (local) or "/tmp/uploads" (Cloud Run)
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED = {"png", "jpg", "jpeg", "gif", "webp", "pdf"}

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



# ----------------------------
# helpers for /collect_media
# ----------------------------
def _is_relative_url(u: str) -> bool:
    try:
        p = urlparse(u)
        return not p.scheme and not p.netloc
    except Exception:
        return False


def _to_abs_url(u: str) -> str:
    """Turn '/uploads/abc.jpg' into 'http(s)://host/uploads/abc.jpg'."""
    if not u:
        return u
    if _is_relative_url(u):
        base = request.host_url.rstrip("/")
        return f"{base}/{u.lstrip('/')}"
    return u


def _safe_upload_disk_path_from_url(u: str):
    """
    If u is a relative '/uploads/...' URL, map it to a safe path under UPLOAD_DIR.
    Returns None if u is not relative or not under '/uploads/'.
    """
    if not u or not _is_relative_url(u):
        return None
    if not u.startswith("/uploads/"):
        return None

    rel = u[len("/uploads/"):]  # e.g., 'sub/abc.jpg'
    # sanitize and prevent traversal
    safe_rel = os.path.normpath(rel).lstrip(os.sep)
    full = os.path.abspath(os.path.join(UPLOAD_DIR, safe_rel))
    if os.path.commonpath([full, UPLOAD_DIR]) != os.path.abspath(UPLOAD_DIR):
        return None
    return full

def _as_str(v) -> str:
    return v if isinstance(v, str) else ""

def _as_int(v) -> int:
    try:
        return int(v)
    except Exception:
        return 0

# ----------------------------
# collect_media endpoint
# ----------------------------
@app.post("/collect_media")
def collect_media():
    """
    Accepts the JSON payload built on the frontend:
    {
      "preview": { "url": "string" },
      "gallery": {
        "urls": [...],
        "previewUrls": [...],
        "names": [...],
        "sizes": [...],
        "mimeTypes": [...],
        "uids": [...]
      }
    }
    Returns a normalized summary (absolute URLs, optional disk paths).
    """
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "invalid or missing JSON body"}), 400

    preview = data.get("preview")
    gallery = data.get("gallery")

    if not isinstance(preview, dict):
        return jsonify({"error": "'preview' must be an object"}), 400
    if not isinstance(gallery, dict):
        return jsonify({"error": "'gallery' must be an object"}), 400

    preview_url = _as_str(preview.get("url"))
    if not preview_url:
        return jsonify({"error": "missing 'preview.url'"}), 400

    # Pull lists (allow empty but must be lists if present)
    def get_list(obj, key):
        v = obj.get(key, [])
        if not isinstance(v, list):
            return None, jsonify({"error": f"'gallery.{key}' must be an array"}), 400
        return v, None, None

    urls, err_resp, err_code = get_list(gallery, "urls")
    if err_resp: return err_resp, err_code
    previewUrls, err_resp, err_code = get_list(gallery, "previewUrls")
    if err_resp: return err_resp, err_code
    names, err_resp, err_code = get_list(gallery, "names")
    if err_resp: return err_resp, err_code
    sizes, err_resp, err_code = get_list(gallery, "sizes")
    if err_resp: return err_resp, err_code
    mimeTypes, err_resp, err_code = get_list(gallery, "mimeTypes")
    if err_resp: return err_resp, err_code
    uids, err_resp, err_code = get_list(gallery, "uids")
    if err_resp: return err_resp, err_code

    n = len(urls)
    if not all(len(lst) == n for lst in [previewUrls, names, sizes, mimeTypes, uids]):
        return jsonify({"error": "all gallery arrays must have the same length"}), 400

    # Build normalized records
    items = []
    for i in range(n):
        url_raw = _as_str(urls[i])
        purl_raw = _as_str(previewUrls[i])

        url_abs = _to_abs_url(url_raw)
        purl_abs = _to_abs_url(purl_raw)

        url_disk = _safe_upload_disk_path_from_url(url_raw)
        purl_disk = _safe_upload_disk_path_from_url(purl_raw)

        exists_main = bool(url_disk and os.path.isfile(url_disk))
        exists_prev = bool(purl_disk and os.path.isfile(purl_disk))

        items.append({
            "uid": _as_str(uids[i]),
            "name": _as_str(names[i]),
            "mimeType": _as_str(mimeTypes[i]),
            "size": _as_int(sizes[i]),
            "url": {
                "raw": url_raw,
                "absolute": url_abs,
                "disk": url_disk,
                "existsOnDisk": exists_main,
            },
            "previewUrl": {
                "raw": purl_raw,
                "absolute": purl_abs,
                "disk": purl_disk,
                "existsOnDisk": exists_prev,
            },
        })

    # You could persist here (DB write), e.g. save selection per user/session.

    return jsonify({
        "ok": True,
        "preview": {
            "url": {
                "raw": preview_url,
                "absolute": _to_abs_url(preview_url),
                "disk": _safe_upload_disk_path_from_url(preview_url),
            }
        },
        "gallery": {
            "count": len(items),
            "items": items,
        }
    }), 201
