# worker_logic.py
import uuid
from firestore import jobs_update
from .replicate_jobs import generate_nano_banana
from gcs import upload_url_to_gcs_signed
from app import storage_client

def prepare_job_update(results,dest_gcs_folder,upload_to_cdn=True):
    '''
    Stores the data on gcs and prepares for job update
    '''
    gcs_res = {}
    replicate_items = []
    
    for generation_id, res in results.items():  
        
        # here we need to download the image and store to gcs
        for url in res.get('urls',[]):
            
            if upload_to_cdn:
                gcs_res = upload_url_to_gcs_signed(
                    client= storage_client,
                    file_url= url,
                    gcs_path= dest_gcs_folder,
                )
        
            replicate_items.append({
                "generation_id": generation_id,
                "gcs_path":gcs_res.get('gcs_path'),
                "signed_url":gcs_res.get('signed_url'),
                "mimetype":gcs_res.get('content_type'),
                "filename":gcs_res.get("filename"),
                #"prompt": res.get("prompt"),
                #"inputs": res.get("inputs"),
                "url": url,     # remote URLs from Replicate 
                "error": res.get("error"),
            })

    return {"status": "succeeded", "results": replicate_items}


def run_nano_banana_job(db, job_id: str, uid: str, media: dict, prompt: str):
    
    print(f"updating job {job_id}")
    jobs_update(db, job_id, uid,  {"status": "running"})
    
    try:
        results = generate_nano_banana(
            image_urls=media,
            prompt=prompt,
            aspect_ratio="4:3",
            output_format="png",
            model_slug="google/nano-banana",
            version=None,
            from_disk=False,
        )
        
        payload = prepare_job_update(
            results= results, 
            dest_gcs_folder=f'user/{uid}/jobs/{job_id}/results'
        )
        jobs_update(db, job_id, uid, payload)
    
    except Exception as e:
        jobs_update(db, job_id, uid, {"status": "failed", "error": repr(e)})



def run_sync_nano_banana_job(job_id: str, uid: str, media: dict, prompt: str):
       
    try:
        results = generate_nano_banana(
            image_urls=media,
            prompt=prompt,
            aspect_ratio="3:4",
            output_format="png",
            model_slug="google/nano-banana",
            version=None,
            from_disk=False,
        )

        
        payload = prepare_job_update(
            results= results, 
            dest_gcs_folder=f'tmp/uploads/users/{uid}'
        )
        return payload
    
    except Exception as e:
        return {"status": "failed", "error": repr(e)}