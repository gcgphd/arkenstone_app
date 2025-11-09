import os

GCS_BUCKET = os.environ["GCS_BUCKET"]

def delete_gcs_folder(client, folder_path: str, bucket_name: str = GCS_BUCKET,) -> int:
    """
    Delete all objects under a given GCS 'folder' (prefix).
    Returns the number of deleted objects.
    Does nothing if the folder doesn't exist.
    """
    # Normalize folder name (strip leading slashes, ensure trailing /)
    folder_path = folder_path.strip("/").rstrip("/") + "/"

    bucket = client.bucket(bucket_name)
    blobs = list(bucket.list_blobs(prefix=folder_path))

    if not blobs:
        print(f"⚪ No folder found at: gs://{bucket_name}/{folder_path}")
        return 0

    # Bulk delete for efficiency
    bucket.delete_blobs(blobs)
    print(f"🗑️ Deleted {len(blobs)} objects from gs://{bucket_name}/{folder_path}")
    return len(blobs)