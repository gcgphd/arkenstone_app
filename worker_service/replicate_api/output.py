
import os
import requests
from replicate.helpers import FileOutput


def collect_outputs(out):
    '''
    Based on the output type collects
    the results coming from the generation API.
    '''

    # --- Normalize result ---
    if isinstance(out, FileOutput) or isinstance(out, str):
        outputs = [out]
    elif isinstance(out, list) and all(isinstance(o, FileOutput) for o in out):
        outputs = out
    elif isinstance(out, list):
        # old-style list of URLs or mixed results
        outputs = []
        for o in out:
            if isinstance(o, FileOutput):
                outputs.append(o)
            elif isinstance(o, str):
                # convert to FileOutput-like minimal shim
                f = FileOutput(o)
                outputs.append(f)
    else:
        outputs = []

    return outputs


def collect_urls(outputs,generation_id,output_dir = None):
    
    urls,files = [],[]
    
    if not outputs:
        return urls,files

    for j, fo in enumerate(outputs, 1):
        
        if hasattr(fo, "url"):
            urls.append(str(fo.url))
        elif isinstance(fo, str):
            urls.append(fo)
        else:
            continue

        if output_dir:  
            
            # create or set the output dir
            os.makedirs(output_dir, exist_ok=True)
            name = f"seed_{generation_id+1:02d}_img_{j:02d}.png"
            dest = os.path.join(output_dir, name)
            
            # try to download the files 
            try:
                with fo.open() as f:
                    with open(dest, "wb") as out_f:
                        out_f.write(f.read())
            
            except Exception:
                # fallback: download via URL
                r = requests.get(fo.url, timeout=60)
                r.raise_for_status()
                with open(dest, "wb") as out_f:
                    out_f.write(r.content)
            files.append(dest)
    
    return urls,files
