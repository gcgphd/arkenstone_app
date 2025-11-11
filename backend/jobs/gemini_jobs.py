import uuid
from gemini_api import generate_image
from gcs import upload_bytes_signed
from google.genai import errors
from jobs import jobs_update

from app import storage_client,gemini_client


def handle_error(e,errtype):
    if errtype == "api":
        return {
            "status": "failed",
            "error": {
                "status": e.status,
                "reason": e.reason,
                "message": e.message,
                "details": e.details,
            },
        }
    return {
        "status": "failed",
        "error": {
            "status": "INTERNAL",
            "reason": type(e).__name__,
            "message": str(e),
            "details": None,
        }
    }


def prepare_gemini_job_update(results,dest_gcs_folder):
    '''
    Stores the data on gcs and prepares for job update
    '''
    gcs_res = {}
    result_items = []
    
    for result in results.get("results",[]):  

        generation_id = str(uuid.uuid4())
    
        gcs_res = upload_bytes_signed(
            client=storage_client,
            file_bytes=result.get("bytes"),
            gcs_path=dest_gcs_folder,
            filename=f"{generation_id}.png",
            content_type=result.get("mimetype"),
            expires_hours=24,
        )
    
        result_items.append({
            "generation_id": generation_id,
            "gcs_path":gcs_res.get('gcs_path'),
            "signed_url":gcs_res.get('signed_url'),
            "mimetype":gcs_res.get('content_type'),
            "filename":gcs_res.get("filename"),
            #"prompt": res.get("prompt"),
            #"inputs": res.get("inputs"),
            "url": gcs_res.get('signed_url'),     # remote URLs from Replicate 
            "error": gcs_res.get("error"),
        })

    return {"status": "succeeded", "results": result_items}



def generate_gemini_nano_banana(
    gemini_client,
    image_urls,
    prompt,
    aspect_ratio=None,
    model_slug="gemini-2.5-flash-image",
):
    
    # try to generate the image
    
    img_bytes, mime_type = generate_image(
        client=gemini_client,
        prompt=prompt,
        image_urls=image_urls,
        model = model_slug,
        aspect_ratio=aspect_ratio    
    )

    return {"results":[{"bytes":img_bytes,"mimetype":mime_type}]}


    

def run_gemini_nano_banana_job(db, job_id: str, uid: str, media: dict, prompt: str):
    
    print(f"updating job {job_id}")
    jobs_update(db, job_id, uid,  {"status": "running"})
    
    try:
        results = generate_gemini_nano_banana(
            gemini_client=gemini_client,
            image_urls=media,
            prompt=prompt,
            aspect_ratio=None,
            model_slug="gemini-2.5-flash-image",
        )
        
        payload = prepare_gemini_job_update(
            results= results, 
            dest_gcs_folder=f'user/{uid}/jobs/{job_id}/results'
        )
        jobs_update(db, job_id, uid, payload)
    

    except errors.APIError as e:
        error_payload = handle_error(e,errtype="api")
        jobs_update(db, job_id, uid, error_payload)
    except Exception as e:
        error_payload = handle_error(e,errtype="internal")
        jobs_update(db, job_id, uid, error_payload)
    

def run_sync_gemini_nano_banana(uid: str, media: dict, prompt: str):
       
    try:
        results = generate_gemini_nano_banana(
            gemini_client=gemini_client,
            image_urls=media,
            prompt=prompt,
            aspect_ratio=None,
            model_slug="gemini-2.5-flash-image",
        )
        
        payload = prepare_gemini_job_update(
            results= results, 
            dest_gcs_folder=f'tmp/uploads/users/{uid}'
        )
        return payload
    
    except errors.APIError as e:
        return handle_error(e,errtype="api")

    except Exception as e:
        return handle_error(e,errtype="internal")



 