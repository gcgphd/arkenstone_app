# ==========================================
# Threaded Replicate integration (drop-in)
# ==========================================
# Requires: pip install replicate requests

import os
import time
import pathlib
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List, Union
from concurrent.futures import ThreadPoolExecutor, as_completed
from .client import get_replicate_client
from .generate import _replicate_call_once,_replicate_call_with_retries



def _ensure_dir(path: str) -> str:
    pathlib.Path(path).mkdir(parents=True, exist_ok=True)
    return path


def generate_job_id(prefix="maijob"):
    """
    Generate a unique job ID using timestamp and UUID4.

    Example output: JOB-20251029-091523-7f9c1a2b
    """
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    unique_suffix = uuid.uuid4().hex[:8]  # short random part
    job_id = f"{prefix}-{timestamp}-{unique_suffix}"
    return job_id


def generate_with_replicate_threaded(
    prompts: List[str],
    model_slug: Optional[str] = None,
    version: Optional[str] = None,
    payloads: Optional[Union[Dict[str, Any], List[Optional[Dict[str, Any]]]]] = None,
    output_dir: Optional[str] = None,
    max_workers: int = 4,
    retries: int = 2,
    base_sleep: float = 1.0,
    stagger_ms: int = 150,
) -> Dict[int, Dict[str, Any]]:
    """
    Threaded image generation on Replicate with per-model payload defaults.
    payloads can be:
      - None -> only model defaults are used
      - dict -> same payload merged for all prompts
      - list[dict or None] -> per-prompt payload override
    """

    model_slug = model_slug or os.getenv("REPLICATE_MODEL_SLUG", "google/nano-banana")
    version = version or os.getenv("REPLICATE_MODEL_VERSION", None)
    if output_dir:
        _ensure_dir(output_dir)

    client = get_replicate_client()
    results: Dict[int, Dict[str, Any]] = {}

    # Normalize payloads to per-prompt list
    if payloads is None:
        per_prompt_payloads: List[Optional[Dict[str, Any]]] = [None] * len(prompts)
    elif isinstance(payloads, dict):
        per_prompt_payloads = [payloads] * len(prompts)
    else:
        per_prompt_payloads = list(payloads)[:len(prompts)]
        if len(per_prompt_payloads) < len(prompts):
            per_prompt_payloads += [None] * (len(prompts) - len(per_prompt_payloads))

    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        futures = []
        jobid = generate_job_id()

        for (p, up) in zip(prompts, per_prompt_payloads):
            if stagger_ms:
                time.sleep(stagger_ms / 1000.0)
            futures.append(
                ex.submit(
                    _replicate_call_with_retries,
                    jobid, p, client, model_slug, version,
                    up,                    # << user_payload per prompt
                    output_dir, retries, base_sleep
                )
            )

        for fut in as_completed(futures):
            res = fut.result()
            results[res['jobid']] = res

    # Keep deterministic ordering
    return dict(sorted(results.items(), key=lambda kv: kv[0]))



def generate_with_replicate_sequential(
    prompts: List[str],
    model_slug: Optional[str] = None,
    version: Optional[str] = None,
    payloads: Optional[Union[Dict[str, Any], List[Optional[Dict[str, Any]]]]] = None,
    output_dir: Optional[str] = None,
) -> Dict[int, Dict[str, Any]]:
    """
    Sequential (non-threaded) version of generate_with_replicate_threaded.
    Runs each prompt one by one in order.
    """

    model_slug = model_slug or os.getenv("REPLICATE_MODEL_SLUG", "google/nano-banana")
    version = version or os.getenv("REPLICATE_MODEL_VERSION", None)
    if output_dir:
        _ensure_dir(output_dir)

    client = get_replicate_client()
    results: Dict[int, Dict[str, Any]] = {}

    # Normalize payloads to per-prompt list
    if payloads is None:
        per_prompt_payloads: List[Optional[Dict[str, Any]]] = [None] * len(prompts)
    elif isinstance(payloads, dict):
        per_prompt_payloads = [payloads] * len(prompts)
    else:
        per_prompt_payloads = list(payloads)[:len(prompts)]
        if len(per_prompt_payloads) < len(prompts):
            per_prompt_payloads += [None] * (len(prompts) - len(per_prompt_payloads))

    # Sequentially process each prompt
    for (p, up) in zip(prompts, per_prompt_payloads):
        
        jobid = generate_job_id()

        print(f"[main-thread] idx={jobid} -> replicate.run({model_slug})")
        res = _replicate_call_once(
            jobid=jobid,
            prompt_text=p,
            client=client,
            model_slug=model_slug,
            version=version,
            user_payload=up,
            output_dir=output_dir,
        )
        results[jobid] = res
    
    # Deterministic ordering
    return dict(sorted(results.items(), key=lambda kv: kv[0]))