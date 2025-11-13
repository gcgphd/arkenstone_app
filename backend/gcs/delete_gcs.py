import os

GCS_BUCKET = os.environ["GCS_BUCKET"]

def delete_gcs_folder(
    client,
    folder_path: str,
    bucket_name: str = GCS_BUCKET,
) -> int:
    """
    Delete all objects under a given GCS 'folder' (prefix) and any placeholder
    object that represents the folder itself.
    Returns the number of deleted objects.
    """

    # Normalize
    normalized = folder_path.strip("/").rstrip("/")      # e.g. "user/uid/jobs/jobid"
    prefix = normalized + "/"                            # e.g. "user/uid/jobs/jobid/"

    bucket = client.bucket(bucket_name)

    # 1) All children under prefix/
    blobs = list(bucket.list_blobs(prefix=prefix))

    # 2) Optional placeholder object without trailing slash: "user/uid/jobs/jobid"
    folder_blob = bucket.blob(normalized)
    if folder_blob.exists():
        blobs.append(folder_blob)

    if not blobs:
        print(f"ℹ️ No objects found at: gs://{bucket_name}/{prefix}")
        return 0

    bucket.delete_blobs(blobs)
    print(f"🗑️ Deleted {len(blobs)} objects for folder gs://{bucket_name}/{normalized}")
    return len(blobs)