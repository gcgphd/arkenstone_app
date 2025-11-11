import requests
from typing import List, Tuple, Optional
from google import genai
from google.genai import types


def generate_image(
    client: genai.Client,
    prompt: str,
    image_urls: Optional[List[str]] = None,
    model: str = "gemini-2.5-flash-image",
    aspect_ratio: Optional[str] = None,
) -> Tuple[Optional[bytes], str]:
    """
    Generate an image using Gemini (Nano Banana).
    Returns: (raw_bytes, mime_type)
    """
    image_urls = image_urls or []

    # Prepare prompt as the first part
    parts = [types.Part.from_text(text=prompt)]

    # Add input image(s) if any
    for u in image_urls:
        mime = "image/png" if u.lower().endswith(".png") else "image/jpeg"

        if u.startswith("gs://"):
            part = types.Part.from_uri(file_uri=u, mime_type=mime)
        else:
            # safer for signed / expiring URLs
            resp = requests.get(u, timeout=30)
            resp.raise_for_status()
            part = types.Part.from_bytes(data=resp.content, mime_type=mime)

        parts.append(part)

    # config aspect ratio
    img_config = types.ImageConfig(aspect_ratio=aspect_ratio) if aspect_ratio else None

    # Generate image
    response = client.models.generate_content(
        model=model,
        contents=parts,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=img_config,
        ),
    )

    # Extract first image part as bytes
    for part in getattr(response, "parts", []):
        if getattr(part, "inline_data", None):
            return part.inline_data.data, part.inline_data.mime_type

    # Fallback: iterate candidates
    for cand in getattr(response, "candidates", []):
        for part in cand.content.parts:
            if getattr(part, "inline_data", None):
                return part.inline_data.data, part.inline_data.mime_type

    # If nothing found
    return None, "image/png"



# upload to GCS
# storage_client = storage.Client()
# bucket = storage_client.bucket("my_bucket")
# blob = bucket.blob("gemini_outputs/output.png")
# blob.upload_from_file(io.BytesIO(img_bytes), content_type="image/png")

# print("Public URL:", blob.public_url)