# app/replicate_jobs.py

from __future__ import annotations
import os
from typing import List, Dict, Any, Optional

from replicate_api import (
    generate_with_replicate_sequential,
    generate_with_replicate_threaded,
    upload_images_to_replicate_cdn
)


DEFAULT_INPUT_KEY = "image"  # change to what your model expects (e.g., "image_url")

def _ensure_dir(path: str) -> str:
    os.makedirs(path, exist_ok=True)
    return path

def _normalize_payloads(
    image_urls: List[str],
    base_payload: Optional[Dict[str, Any]],
    per_image_payloads: Optional[List[Optional[Dict[str, Any]]]],
    input_key: str,
) -> List[Optional[Dict[str, Any]]]:
    """
    Build the payload list passed to generate_with_replicate_threaded, one per image.
    Each payload injects the image URL under `input_key`, then merges base/per-image overrides.
    """
    n = len(image_urls)
    # start with all None
    out: List[Optional[Dict[str, Any]]] = [None] * n

    # Normalize per-image payloads length
    if per_image_payloads is not None:
        per_image_payloads = list(per_image_payloads)[:n]
        if len(per_image_payloads) < n:
            per_image_payloads += [None] * (n - len(per_image_payloads))

    for i, url in enumerate(image_urls):
        p: Dict[str, Any] = {}
        p[input_key] = url
        if base_payload:
            p.update(base_payload)
        if per_image_payloads and per_image_payloads[i]:
            p.update(per_image_payloads[i])  # last wins
        out[i] = p
    return out


def generate_from_image_urls(
    image_urls: List[str],
    *,
    base_prompt: str,
    model_slug: Optional[str] = None,
    version: Optional[str] = None,
    base_payload: Optional[Dict[str, Any]] = None,
    per_image_payloads: Optional[List[Optional[Dict[str, Any]]]] = None,
    input_key: str = DEFAULT_INPUT_KEY,
    output_dir: Optional[str] = None,
    uploads_root: Optional[str] = None,  # fallback to ./uploads if not provided
    output_subdir: str = "generated",
    max_workers: int = 4,
    retries: int = 2,
    base_sleep: float = 1.0,
    stagger_ms: int = 150,
) -> Dict[int, Dict[str, Any]]:
    """
    Kick off threaded Replicate jobs using the given image URLs.

    Returns the dict from generate_with_replicate_threaded:
      { idx: { "prompt": ..., "inputs": ..., "urls": [..], "files": [..], ... }, ... }
    """
    if not image_urls:
        return {}

    # Where to save generated images (optional; if you pass None, helper may still return remote URLs)
    if output_dir is None:
        uploads_root = uploads_root or os.environ.get("UPLOAD_DIR") or "./uploads"
        output_dir = _ensure_dir(os.path.join(uploads_root, output_subdir))
    else:
        _ensure_dir(output_dir)

    # Replicate expects a prompt per job
    prompts = [base_prompt] * len(image_urls)

    # Build per-image payloads (inject the image URL into the proper input key)
    payloads = _normalize_payloads(
        image_urls=image_urls,
        base_payload=base_payload,
        per_image_payloads=per_image_payloads,
        input_key=input_key,
    )

    # Fire!
    results = generate_with_replicate_threaded(
        prompts=prompts,
        model_slug=model_slug,
        version=version,
        payloads=payloads,
        output_dir=output_dir,
        max_workers=max_workers,
        retries=retries,
        base_sleep=base_sleep,
        stagger_ms=stagger_ms,
    )
    return results


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
        #max_workers=1,
        # retries=2,
        # base_sleep=1.0,
        #stagger_ms=0,
    )
