import replicate
import threading
import time
from copy import deepcopy
from typing import Dict, Any, Optional, Tuple
from .models import _resolve_model_config
from .output import collect_outputs, collect_urls


def _apply_aliases(payload: Dict[str, Any], aliases: Dict[str, str]) -> Dict[str, Any]:
    out = {}
    for k, v in payload.items():
        out[aliases.get(k, k)] = v
    return out


def _merge_and_harmonize_inputs(
    model_slug: str,
    prompt_text: str,
    user_payload: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Merge per-model defaults with user payload and attach prompt.
    Apply aliases, filter allowed keys, and run model adapter.
    """
    cfg = _resolve_model_config(model_slug)

    merged = deepcopy(cfg.default_inputs)
    if user_payload:
        # First normalize aliases
        user_normalized = _apply_aliases(user_payload, cfg.aliases)
        merged.update(user_normalized)

    # The prompt always wins
    merged["prompt"] = prompt_text

    # Filter unknown keys if required
    if cfg.allowed_keys and not cfg.allow_unknown:
        merged = {k: v for k, v in merged.items() if k in cfg.allowed_keys}

    # Final model-specific tweaks
    if cfg.adapter:
        merged = cfg.adapter(merged)

    return merged


def _replicate_call_once(
    generation_id: str,
    prompt_text: str,
    client: replicate.Client,
    model_slug: str,
    version: Optional[str],
    user_payload: Optional[Dict[str, Any]],
    output_dir: Optional[str],
) -> Tuple[int, Dict[str, Any]]:
    

    inp = _merge_and_harmonize_inputs(model_slug, prompt_text, user_payload)
    print(f"[jobid={generation_id} -> replicate.run({model_slug})")

    # run the generation
    if version:
        out = client.run(f"{model_slug}:{version}", input=inp) 
    else:
        out= client.run(model_slug, input=inp)
    
    # collect outputs
    outputs = collect_outputs(out)
    
    # Collect URLs and optionally save
    urls,files = collect_urls(outputs,generation_id,output_dir)
    
    return {"generation_id":generation_id, "prompt": prompt_text, "inputs": inp, "urls": urls, "files": files}



def _replicate_call_with_retries(
    jobid: str,
    prompt_text: str,
    client: replicate.Client,
    model_slug: str,
    version: Optional[str],
    user_payload: Optional[Dict[str, Any]],
    output_dir: Optional[str],
    retries: int,
    base_sleep: float,
) -> Tuple[int, Dict[str, Any]]:
    
    thread_name = threading.current_thread().name
  
    attempt, last_err,  = 0, None

    while attempt <= retries:
        try:
            inp = _merge_and_harmonize_inputs(model_slug, prompt_text, user_payload)

            print(f"[{thread_name}] jobid={jobid} attempt={attempt} -> replicate.run({model_slug})")

            if version:
                out = client.run(f"{model_slug}:{version}", input=inp) 
            else:
                out= client.run(model_slug, input=inp)
            
            print(out,type(out))

            # collect outputs
            outputs = collect_outputs(out)

            # Collect URLs and optionally save
            urls,files = collect_urls(outputs,jobid,output_dir)

            return {"jobid":jobid, "prompt": prompt_text, "inputs": inp, "urls": urls, "files": files}

        except Exception as e:
            print(e)
            last_err = e
            attempt += 1
            print(f"[{thread_name}] jobid={jobid} attempt={attempt} ERROR: {repr(e)}")
            if attempt > retries:
                return jobid, {
                    "prompt": prompt_text,
                    "inputs": inp if 'inp' in locals() else {},
                    "error": repr(last_err),
                    "urls": [],
                    "files": [],
                }
            time.sleep(base_sleep * attempt)

    return {"jobid":jobid, "prompt": prompt_text, "inputs": inp if 'inp' in locals() else {}, "error": "unknown_error", "urls": [], "files": []}