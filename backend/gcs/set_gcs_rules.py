import os

GCS_BUCKET = os.environ["GCS_BUCKET"]
TMP_PREFIX = "tmp/users" 

def set_tmp_expiration_rule(client, bucket_name: str = GCS_BUCKET, tmp_prefix: str = TMP_PREFIX, days: int = 3):
    
    bucket = client.bucket(bucket_name)

    bucket.lifecycle_rules = [
        {
            "action": {"type": "Delete"},
            "condition": {
                "age": days,
                "matchesPrefix": [tmp_prefix],  # applies to everything under users-tmp/
            },
        }
    ]

    bucket.patch()
    print(f"✅ All objects under {tmp_prefix} will auto-delete after {days} days.")