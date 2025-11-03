# app/replicate_jobs.py

from typing import List, Dict, Any, Optional

from replicate_api import (
    generate_with_replicate_sequential,
    upload_images_to_replicate_cdn
)


def generate_nano_banana(
    image_urls: List[str],
    *,
    prompt: str,
    aspect_ratio: str = "match_input_image",
    output_format: str = "png",
    model_slug: str = "google/nano-banana",
    version: Optional[str] = None,
    output_dir: Optional[str] = None,
    from_disk: Optional[bool] = False,

) -> Dict[int, Dict[str, Any]]:
    """
    Calls google/nano-banana once with all image_urls in image_input.
    Returns the standard results dict from generate_with_replicate_threaded.
    """

    if not image_urls:
        return {}
    

    upload_urls = image_urls
    if from_disk:
        # Upload your local files first
        # This will will upload the images to its cdn
        upload_urls = upload_images_to_replicate_cdn(image_urls)
    

    # One prompt and one payload that bundles all images
    prompts = [prompt]
    payloads = [{
        "image_input": upload_urls,
        "aspect_ratio": aspect_ratio,
        "output_format": output_format,
    }]

    # Single worker since it is one job
    return generate_with_replicate_sequential(
        prompts=prompts,
        model_slug=model_slug,
        version=version,
        payloads=payloads,
        output_dir=output_dir,
        retries=2,
        base_sleep=1.0,
    )
