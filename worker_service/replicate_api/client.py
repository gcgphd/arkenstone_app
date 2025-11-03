import os
import replicate

def get_replicate_client() -> replicate.Client:
    api_token = os.getenv("REPLICATE_API_TOKEN")
    if not api_token:
        raise RuntimeError("Missing REPLICATE_API_TOKEN environment variable.")
    return replicate.Client(api_token=api_token)