import os

GCS_BUCKET = os.environ["GCS_BUCKET"]

def copy_blob_within_bucket(client, blob_name: str, new_folder: str):
    """
    Copies a blob (object) from one path to another within the same GCS bucket.

    Args:
        bucket_name: str - name of the GCS bucket
        blob_name: str - source object name (e.g., "images/photo.jpg")
        new_folder: str - target folder name (e.g., "archive/" or "backup/2025/")

    Returns:
        str: the name of the new blob (destination object)
    """
    bucket = client.bucket(GCS_BUCKET)
    source_blob = bucket.blob(blob_name)

    # Extract filename and build new path
    file_name = blob_name.split("/")[-1]
    new_blob_name = f"{new_folder.rstrip('/')}/{file_name}"

    # Perform the copy
    new_blob = bucket.copy_blob(source_blob, bucket, new_blob_name)

    #print(f"✅ Copied {blob_name} to {new_blob_name}")
    return new_blob_name