# app.py
import os
from urllib.parse import urlparse
from flask import request, jsonify
from typing import Optional
from app import app  # keep your existing import

# ----------------------------
# Config & setup
# ----------------------------
UPLOAD_DIR = app.config['UPLOAD_DIR']  # e.g. "./uploads" (local) or "/tmp/uploads" (Cloud Run)
os.makedirs(UPLOAD_DIR, exist_ok=True)



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


def _safe_upload_disk_path(u: str):
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


def _safe_upload_disk_path(u: str):
    """
    Map either a relative '/uploads/...' OR an absolute 'http(s)://host/uploads/...'
    to a safe path under UPLOAD_DIR. Returns None if it doesn't point under /uploads/.
    """
    if not u:
        return None

    p = urlparse(u)
    # If absolute URL, take only the path (e.g., '/uploads/abc.jpg')
    path = p.path if (p.scheme or p.netloc) else u

    if not path.startswith("/uploads/"):
        return None

    rel = path[len("/uploads/"):]  # 'abc.jpg' or 'sub/abc.jpg'
    safe_rel = os.path.normpath(rel).lstrip(os.sep)
    full = os.path.abspath(os.path.join(UPLOAD_DIR, safe_rel))

    if os.path.commonpath([full, os.path.abspath(UPLOAD_DIR)]) != os.path.abspath(UPLOAD_DIR):
        return None
    return full


def _as_str(v) -> str:
    return v if isinstance(v, str) else ""

def _as_int(v) -> int:
    try:
        return int(v)
    except Exception:
        return 0


def _as_file_input(raw: str, absolute: str) -> Optional[str]:
        """
        Prefer local disk path when available; otherwise use public https URL.
        Returns None if neither is usable (e.g., localhost URL with no disk file).
        """
        disk = _safe_upload_disk_path(raw) or _safe_upload_disk_path(absolute)
        if disk and os.path.isfile(disk):
            return disk  # SDK will upload the file
        if absolute.startswith("http") and not any(h in absolute for h in ("localhost", "127.0.0.1")):
            return absolute  # public URL that Replicate can fetch
        return None


# Pull lists (allow empty but must be lists if present)
def get_list(obj, key):
    v = obj.get(key, [])
    if not isinstance(v, list):
        return None, jsonify({"error": f"'gallery.{key}' must be an array"}), 400
    return v, None, None


# ----------------------------
# collect_media endpoint
# ----------------------------
def collect_media(request):
    """
    Accepts the JSON payload built on the frontend and optionally triggers a Replicate job.
    """
    data = request.get_json(silent=True)
    if data is None:
        raise Exception("invalid or missing JSON body")

    preview = data.get("preview")
    gallery = data.get("gallery")

    if not isinstance(preview, dict):
        raise Exception("'preview' must be an object")
    if not isinstance(gallery, dict):
        raise Exception("'gallery' must be an object")

    preview_url = _as_str(preview.get("url"))
    if not preview_url:
        raise Exception("missing 'preview.url'")


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
        raise Exception("all gallery arrays must have the same length")

    # Build normalized records
    items = []
    for i in range(n):
        url_raw = _as_str(urls[i])
        purl_raw = _as_str(previewUrls[i])

        url_abs = _to_abs_url(url_raw)
        purl_abs = _to_abs_url(purl_raw)

        url_disk = _safe_upload_disk_path(url_raw)
        purl_disk = _safe_upload_disk_path(purl_raw)

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

 
    

    # Preview must be usable (first image = subject)
    preview_input = _as_file_input(preview_url, _to_abs_url(preview_url))
    if not preview_input:
        raise Exception(
            "preview image is not accessible. "
            "Use a local uploaded file (served under /uploads) or a public https URL."
        )

    # Gallery images (optional)
    gallery_inputs = []
    for it in items:
        fin = _as_file_input(it["url"]["raw"], it["url"]["absolute"])
        if fin:
            gallery_inputs.append(fin)

    file_inputs = [preview_input] + gallery_inputs

    
    return {'file_inputs': file_inputs, 'preview_url':preview_url, 'items':items}