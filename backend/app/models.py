# app.py
from flask import request, jsonify
from app import app  
from gcs import copy_blob_within_bucket,get_files_in_folder, get_signed_url,delete_gcs_file
from app import storage_client


@app.route("/api/get_models", methods=["POST"])
def api_get_models():
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"ok": False, "message": "invalid or missing JSON body"}), 400

    uid = data.get("uid")
    if uid is None:
        return jsonify({"ok": False, "message": "invalid or missing uid"}), 400

    dest_gcs_folder = f"user/{uid}/models"

    try:
        models_gcs_paths = get_files_in_folder(storage_client, dest_gcs_folder)

        results = []
        for m in models_gcs_paths:
            # from get_files_in_folder
            model_gcs_path = m.get("gcs_path")

            signed = get_signed_url(storage_client, model_gcs_path)

            results.append({
                "ok": True,
                "filename": m.get("filename"),
                "size": m.get("size"),
                "mimetype": m.get("mimetype"),
                "url": signed["signed_url"],
                "thumbUrl": signed["signed_url"],
                "gcs_path": signed["gcs_path"],
                "cdn": "gcs-signed",
            })

        return jsonify({"ok": True, "message": "Success", "results": results}), 200

    except Exception as e:
        print(e)
        return jsonify({"ok": False, "message": f"Error in Getting Models: {e}"}), 400



@app.route("/api/save_model", methods=["POST"])
def api_save_model():

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"ok": False, "message": "invalid or missing JSON body"}), 400

    uid = data.get("uid")
    if uid is None:
        return jsonify({"ok": False, "message": "invalid or missing uid"}), 400

    dest_gcs_folder = f"user/{uid}/models"  

    modelinfo = data.get("model")
    if not isinstance(modelinfo, dict):
        return jsonify({"ok": False, "message": "Input not correctly formatted"}), 400

    model_gcs_path = modelinfo.get("gcs_path")
    if not model_gcs_path or not isinstance(model_gcs_path, str):
        return jsonify({"ok": False, "message": "Impossible to locate image on storage"}), 400

    try:
        dest_gcs_path = copy_blob_within_bucket(
            client=storage_client,
            blob_name=model_gcs_path,
            new_folder=dest_gcs_folder,
        )


        return jsonify({"ok": True, "message": "Model Correctly Saved"}), 202
    except Exception as e:
        return jsonify({"ok": False, "message": f"Error in Saving Model: {e}"}), 400
    

@app.route("/api/delete_model", methods=["POST"])
def api_delete_model():
    """
    Deletes model image in Cloud Storage
    """

    # collect data
    data = request.get_json(silent=True)
    if data is None:
        return jsonify({"error": "invalid or missing JSON body"}), 400
        
    # collect job id
    gcs_path = data.get('gcs_path')
    if gcs_path is None:
        return jsonify({"error": "Missing item path"}), 400
    
    # delete both firestore and gcs bucket
    try:
        done = delete_gcs_file(storage_client,gcs_path)
        if done:
            return jsonify({"status":"success","message":"Correctly Delete Generation"}), 200
        else:
            return jsonify({"status":"fail","message": f"File not found."}), 400
    except Exception as e:
        return jsonify({"status":"fail","message": f"Could not delete entry {e}"}), 400
    
   




    