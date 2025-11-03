# worker_logic.py
from firestore import jobs_update
from .replicate_jobs import generate_nano_banana

def run_nano_banana_job(db, job_id: str, uid: str, media: dict, prompt: str):
    
    print(f"updating job {job_id}")
    jobs_update(db, job_id, uid,  {"status": "running"})
    
    try:
        results = generate_nano_banana(
            image_urls=media,
            prompt=prompt,
            aspect_ratio="match_input_image",
            output_format="png",
            model_slug="google/nano-banana",
            version=None,
            from_disk=False,
        )

        replicate_items = []
        for generation_id, res in results.items():
            replicate_items.append({
                "generation_id": generation_id,
                "prompt": res.get("prompt"),
                "inputs": res.get("inputs"),
                "urls": res.get("urls", []),     # remote URLs from Replicate
                "files": res.get("files", []),   # should be empty since we don't save locally
                "error": res.get("error"),
            })
        replicate_block = {"count": len(replicate_items), "items": replicate_items}
        payload = {"status": "succeeded", "results": replicate_block}
        
        jobs_update(db, job_id, uid, payload)
    
    except Exception as e:
        jobs_update(db, job_id, uid, {"status": "failed", "error": repr(e)})
