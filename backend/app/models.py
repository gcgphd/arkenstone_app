# app.py
from flask import request, jsonify
from app import app  
from gcs import copy_blob_within_bucket
from app import storage_client


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




    