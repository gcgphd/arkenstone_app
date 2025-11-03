# gcs upload
import os
import io
import time
from datetime import timedelta

GCS_BUCKET = os.environ["GCS_BUCKET"]

# _storage_client = None
# def storage_client():
#     global _storage_client
#     if _storage_client is None:
#         _storage_client = storage.Client()
#     return _storage_client


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


def upload_bytes_signed(client,file_bytes: bytes, filename: str, content_type: str, expires_hours: int = 24) -> dict:
    """Upload to private bucket; return a signed URL for GET preview."""
    #client = storage_client()
    bucket = client.bucket(GCS_BUCKET)
    blob = bucket.blob(gcs_object_name(filename))
    blob.cache_control = "public, max-age=3600"
    blob.upload_from_file(io.BytesIO(file_bytes), size=len(file_bytes), content_type=content_type)

    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(hours=expires_hours),
        method="GET",
        response_disposition=f'inline; filename="{filename}"'
    )
    return {
        "signed_url": signed_url,
        "gcs_path": blob.name,
        "content_type": content_type,
    }