# gcs upload
import os
import io
import time
from datetime import timedelta

GCS_BUCKET = os.environ["GCS_BUCKET"]


def get_files_in_folder(client, folder: str, bucket: str = GCS_BUCKET):
    """
    Return a list of object names under the given 'folder' prefix in the bucket.

    Args:
        client: google.cloud.storage.Client
        folder: logical "folder" (prefix), e.g. "user/123/jobs/abc"
        bucket: bucket name (defaults to GCS_BUCKET env var)

    Returns:
        List[str]: list of blob names (full object paths) under that prefix.
    """
    # Normalize folder to always end with a slash
    if folder and not folder.endswith("/"):
        prefix = folder + "/"
    else:
        prefix = folder

    bucket_obj = client.bucket(bucket)

    blobs = client.list_blobs(bucket_obj, prefix=prefix)

    items = []
    for blob in blobs:
        
        # Skip folder marker objects
        if blob.name.endswith("/"):
            continue

        items.append({
            "gcs_path": blob.name,
            "filename": blob.name.split("/")[-1],
            "size": blob.size,
            "mimetype": blob.content_type,
        })

    return items



def get_signed_url(client, gcs_path: str, expires_hours: int = 24) -> dict:
    """
    Generate a signed GET URL for an existing object in the private bucket.

    Args:
        client: google.cloud.storage.Client
        gcs_path: either the full gs:// path or just the object name within the bucket
        expires_hours: how long the signed URL is valid

    Returns:
        dict with {"signed_url", "gcs_path"}
    """
    bucket = client.bucket(GCS_BUCKET)

    # Support both "gs://bucket/path/to/file" and "path/to/file"
    if gcs_path.startswith("gs://"):
        _, _, rest = gcs_path.partition("gs://")
        bucket_name, _, object_name = rest.partition("/")
        if bucket_name != GCS_BUCKET:
            raise ValueError(f"Expected bucket {GCS_BUCKET}, got {bucket_name}")
    else:
        object_name = gcs_path

    blob = bucket.blob(object_name)

    if not blob.exists():
        raise FileNotFoundError(f"Blob not found: {object_name}")

    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(hours=expires_hours),
        method="GET",
        response_disposition=f'attachment; filename="{blob.name.split("/")[-1]}"'
    )

    return {
        "signed_url": signed_url,
        "gcs_path": blob.name,
    }



TMP_PREFIX = "tmp/users"      # ← top-level folder prefix for all users

def set_tmp_expiration_rule(client, bucket_name: str = GCS_BUCKET, days: int = 3):
    
    bucket = client.bucket(bucket_name)

    bucket.lifecycle_rules = [
        {
            "action": {"type": "Delete"},
            "condition": {
                "age": days,
                "matchesPrefix": [TMP_PREFIX],  # applies to everything under users-tmp/
            },
        }
    ]

    bucket.patch()
    print(f"✅ All objects under {TMP_PREFIX} will auto-delete after {days} days.")