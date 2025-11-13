# gcs upload
import os
import io
import time
from datetime import timedelta

GCS_BUCKET = os.environ["GCS_BUCKET"]


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