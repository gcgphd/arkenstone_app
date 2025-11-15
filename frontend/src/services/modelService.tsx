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


type GetModelsResponse = {
    ok: boolean;
    message?: string;
    results?: UploadAsset[];
};

const modelsCache: Record<string, UploadAsset[]> = {};

export async function fetchUserModels(
    uid: string,
    options?: { force?: boolean }
): Promise<UploadAsset[]> {
    if (!uid) return [];

    const force = options?.force ?? false;

    // ✅ skip cache if force === true
    if (!force && modelsCache[uid]) {
        return modelsCache[uid];
    }

    const resp = await fetch(`${BACKEND_URL}/api/get_models`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid }),
    });

    const data: GetModelsResponse = await resp.json();

    if (!data.ok) {
        throw new Error(data.message || "Failed to fetch models");
    }

    const results = data.results || [];
    modelsCache[uid] = results;

    return results;
}

// optional helper if you ever want to nuke cache explicitly
export function clearModelsCache(uid?: string) {
    if (uid) {
        delete modelsCache[uid];
    } else {
        Object.keys(modelsCache).forEach((k) => delete modelsCache[k]);
    }
}



export async function deleteModel(gcs_path: string) {
    const res = await fetch(`${BACKEND_URL}/api/delete_model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gcs_path }),
    });

    const data = await res.json();

    if (!res.ok || data?.status !== "success") {
        throw new Error(data?.message || "Failed to delete model");
    }

    return data;
}
