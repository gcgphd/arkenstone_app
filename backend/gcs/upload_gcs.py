# gcs upload
import uuid
import os
import io
import time
import requests
from urllib.parse import urlparse
import mimetypes
from datetime import timedelta

GCS_BUCKET = os.environ["GCS_BUCKET"]


def gcs_object_name(filename: str, prefix: str = "uploads") -> str:
    ts = int(time.time() * 1000)
    return f"{prefix}/{ts}_{filename}"


def upload_bytes_public(client,file_bytes: bytes, filename: str, content_type: str) -> str:
    """Upload and make publicly readable; return public URL."""
    #client = storage_client()
    bucket = client.bucket(GCS_BUCKET)
    blob = bucket.blob(gcs_object_name(filename))
    blob.cache_control = "public, max-age=31536000, immutable"
    blob.upload_from_file(io.BytesIO(file_bytes), size=len(file_bytes), content_type=content_type)
    blob.make_public()  # object ACL → public
    return blob.public_url  # https://storage.googleapis.com/<bucket>/<path>



def upload_bytes_signed(
        client,
        file_bytes: bytes, 
        gcs_path: str, 
        filename: str, 
        content_type: str, 
        expires_hours: int = 24
    ) -> dict:
    """Upload to private bucket; return a signed URL for GET preview."""
    
    #client = storage_client()
    bucket = client.bucket(GCS_BUCKET)
    blob = bucket.blob(f'{gcs_path}/{filename}')
    blob.cache_control = "public, max-age=3600"
    blob.upload_from_file(io.BytesIO(file_bytes), size=len(file_bytes), content_type=content_type)

    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(hours=expires_hours),
        method="GET",
        response_disposition=f'attachment; filename="{filename}"'
    )
    return {
        "signed_url": signed_url,
        "gcs_path": blob.name,
        "content_type": content_type,
    }


def upload_url_to_gcs_signed(
    client,
    file_url: str,
    gcs_path: str = "uploads",
    filename: str = None,
    expires_hours: int = 24,
    timeout: int = 30,
) -> dict:
    """
    Download a remote file (e.g. from Replicate CDN) and upload it to GCS
    using `upload_bytes_signed`, returning a signed preview URL.
    """

    # 1️⃣ Fetch the remote file
    r = requests.get(file_url, stream=True, timeout=timeout)
    r.raise_for_status()

    # 2️⃣ Determine content type and filename
    content_type = r.headers.get("Content-Type", "application/octet-stream")
    guessed_ext = mimetypes.guess_extension(content_type) or ""
    if not filename:
        # try to preserve filename from the URL path
        path_part = urlparse(file_url).path.split("/")[-1]
        filename = path_part or f"{uuid.uuid4().hex}{guessed_ext}"
        if not any(filename.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".gif", ".webp"]):
            filename += guessed_ext

    # 3️⃣ Read bytes into memory
    file_bytes = r.content  # safe enough for typical image sizes

    # 4️⃣ Upload using your existing helper
    result = upload_bytes_signed(
        client=client,
        file_bytes=file_bytes,
        gcs_path=gcs_path,
        filename=filename,
        content_type=content_type,
        expires_hours=expires_hours,
    )

    # 5️⃣ Return a consistent dict
    return {
        "ok": True,
        "cdn": "gcs-signed",
        "filename": filename,
        "gcs_path": result["gcs_path"],
        "signed_url": result["signed_url"],
        "content_type": content_type,
    }