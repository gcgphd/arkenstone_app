from dataclasses import dataclass, field
from copy import deepcopy
from typing import Dict, Any, Optional, Set, Callable

@dataclass
class ModelConfig:
    slug: str
    # Defaults that this model expects. These are merged before user payload.
    default_inputs: Dict[str, Any] = field(default_factory=dict)
    # Allowed input keys for this model. Unknown keys get dropped unless allow_unknown is True.
    allowed_keys: Set[str] = field(default_factory=set)
    # Aliases for user convenience. Example: {"ar": "aspect_ratio"}
    aliases: Dict[str, str] = field(default_factory=dict)
    # If True, unknown keys are kept and passed through.
    allow_unknown: bool = False
    # Optional adapter that can mutate the merged payload before sending to Replicate.
    adapter: Optional[Callable[[Dict[str, Any]], Dict[str, Any]]] = None


def _resolve_model_config(slug: str) -> ModelConfig:
    return MODEL_REGISTRY.get(slug, ModelConfig(
        slug=slug,
        default_inputs={},
        allowed_keys=set(),
        aliases={},
        allow_unknown=True,   # unknown model, pass through
        adapter=None,
    ))



def _imagen_ultra_adapter(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Example adapter for google/imagen-4-ultra.
    - Prefer aspect_ratio when present.
    - If width or height are present but aspect_ratio is also present, drop wh to avoid conflicts.
    - Normalize output_format if present.
    """
    # Normalize aliases like "ar" -> "aspect_ratio" handled earlier
    ar = payload.get("aspect_ratio")
    w = payload.get("width")
    h = payload.get("height")

    if ar:
        # Imagen Ultra typically supports AR, not strict width/height
        payload.pop("width", None)
        payload.pop("height", None)
        # validate simple forms like "1:1", "4:5", "16:9"
        if isinstance(ar, str) and ":" in ar:
            pass  # assume valid, or add your own whitelist check

    # Optional normalization for format names
    fmt = payload.get("output_format")
    if fmt:
        fmt = str(fmt).lower().strip()
        if fmt in {"jpg", "jpeg"}:
            payload["output_format"] = "jpg"
        elif fmt in {"png", "webp"}:
            payload["output_format"] = fmt
        else:
            # fallback to png if unknown
            payload["output_format"] = "png"

    # safety filter normalization
    level = payload.get("safety_filter_level")
    if level:
        level = str(level).lower().strip()
        valid_levels = {"block_none", "block_low", "block_medium", "block_high", "block_only_high"}
        if level not in valid_levels:
            # fallback to the safe default
            payload["safety_filter_level"] = "block_only_high"
        else:
            payload["safety_filter_level"] = level

    return payload


def _nano_banana_adapter(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    google/nano-banana expects:
      - prompt: str
      - image_input: List[str] of URLs
      - aspect_ratio: 'match_input_image' or like '1:1'
      - output_format: 'jpg'|'png'|'webp'
    Normalize common alias keys and coerce image_input to a list[str].
    """
    # Accept single url under different names and convert to image_input list
    if "image_input" not in payload:
        # map common aliases to image_input
        for k in ("images", "image_urls", "image_url", "image"):
            if k in payload and payload[k]:
                payload["image_input"] = payload.pop(k)
                break

    # Coerce to list[str]
    ii = payload.get("image_input")
    if isinstance(ii, str):
        payload["image_input"] = [ii]
    elif isinstance(ii, (list, tuple)):
        payload["image_input"] = [str(x) for x in ii if x]
    else:
        # leave as is, validate upstream
        pass

    # Normalize output format
    fmt = payload.get("output_format")
    if fmt:
        f = str(fmt).lower().strip()
        if f in {"jpg", "jpeg"}:
            payload["output_format"] = "jpg"
        elif f in {"png", "webp"}:
            payload["output_format"] = f
        else:
            payload["output_format"] = "jpg"  # default for Nano Banana examples

    # aspect_ratio may be 'match_input_image' or ratios like '1:1'
    ar = payload.get("aspect_ratio")
    if isinstance(ar, str):
        payload["aspect_ratio"] = ar.strip()

    return payload


# You can add more models here as you adopt them
MODEL_REGISTRY: Dict[str, ModelConfig] = {
    "google/imagen-4-ultra": ModelConfig(
        slug="google/imagen-4-ultra",
        default_inputs={
            "aspect_ratio": "4:5",
            "output_format": "png",
            "safety_filter_level": "block_only_high"
            # You can add your house defaults here, e.g. "safety_filter": "standard"
        },
        allowed_keys={
            "prompt", "num_outputs", "aspect_ratio", "output_format",
            "seed", "negative_prompt", "safety_filter",  "image", "image_url", "strength"
            # Add extra keys your Imagen Ultra deployment supports
        },
        aliases={
            "ar": "aspect_ratio",
            "fmt": "output_format",
            "safety": "safety_filter_level", 
        },
        allow_unknown=False,
        adapter=_imagen_ultra_adapter,
    ),

    "google/nano-banana": ModelConfig(
        slug="google/nano-banana",
        default_inputs={
            "aspect_ratio": "match_input_image",
            "output_format": "jpg",
        },
        allowed_keys={
            "prompt",
            "image_input",          # array of urls
            "aspect_ratio",
            "output_format",
            # add any extra keys your deployment supports
        },
        aliases={
            "images": "image_input",
            "image": "image_input",
            "image_url": "image_input",
            "image_urls": "image_input",
            "ar": "aspect_ratio",
            "fmt": "output_format",
        },
        allow_unknown=False,
        adapter=_nano_banana_adapter,
    ),
}
