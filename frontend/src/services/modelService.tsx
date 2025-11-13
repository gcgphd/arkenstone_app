// src/services/modelsService.ts
import { BACKEND_URL } from "../config";
import { UploadAsset } from "../types/types";

interface SaveModelResponse {
    ok: boolean;
    message?: string;
}

export async function saveModel(
    uid: string,
    model: UploadAsset
): Promise<SaveModelResponse> {
    const res = await fetch(`${BACKEND_URL}/api/save_model`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            uid,
            model, // backend expects { uid, model: { gcs_path, ... } }
        }),
    });

    let data: SaveModelResponse;
    try {
        data = await res.json();
    } catch {
        throw new Error(`Failed to parse response while saving model (HTTP ${res.status})`);
    }

    if (!res.ok || !data.ok) {
        throw new Error(data.message || `Error saving model (HTTP ${res.status})`);
    }

    return data;
}
