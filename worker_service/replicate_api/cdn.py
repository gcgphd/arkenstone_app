
import io
from typing import Tuple
from .replicate_generate import get_replicate_client

def upload_images_to_replicate_cdn(image_urls):
    '''
    This will upload the image to replicate CND
    and returns a list of urls
    '''

    print('image urls')
    print(image_urls)
    
    # Upload your local files first
    # This will will upload the images to its cdn
    upload_urls = []
    client = get_replicate_client()
    for fpath in image_urls:  # file_inputs are local paths like "./uploads/img1.jpg"
        uploaded = client.files.create(fpath)
        print('uploaded',uploaded)
        upload_urls.append(uploaded.urls['get'])

    print('upload urls')
    print(upload_urls)

    return upload_urls


def upload_filelike_to_replicate(file_bytes: bytes, filename: str) -> Tuple[str, dict]:
    """
    Upload in-memory bytes to Replicate CDN and return the GET url and full file object.
    """
    client = get_replicate_client()
    fileobj = io.BytesIO(file_bytes)
    # Important: provide a filename so Replicate records the name/type
    uploaded = client.files.create(fileobj, filename=filename)
    print(uploaded.__dict__)
    # uploaded.urls typically has 'get' and 'delete'. We return 'get'.
    return uploaded.urls["get"], uploaded  # type: ignore[index]