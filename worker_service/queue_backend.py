# queue_backend.py
import os, json, concurrent.futures
from google.cloud import tasks_v2
from flask import current_app as app

executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

def enqueue_job_dev(run_fn, *, job_id: str, media: dict, prompt: str):
    # background thread; write status via shared helpers
    executor.submit(run_fn, job_id, media, prompt)

def enqueue_job_prod(*, job_id: str, media: dict, prompt: str):
    client = tasks_v2.CloudTasksClient()
    parent = client.queue_path(os.environ["GCP_PROJECT"], os.environ["GCP_LOCATION"], os.environ["TASKS_QUEUE"])
    body = {"job_id": job_id, "media": media, "prompt": prompt}
    task = {
        "http_request": {
            "http_method": tasks_v2.HttpMethod.POST,
            "url": os.environ["WORKER_URL"] + "/run_job",
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(body).encode("utf-8"),
        }
    }
    client.create_task(request={"parent": parent, "task": task})

def enqueue(run_fn, **kwargs):
    if os.getenv("ENV", "dev") == "prod":
        return enqueue_job_prod(**kwargs)
    else:
        return enqueue_job_dev(run_fn, **kwargs)
