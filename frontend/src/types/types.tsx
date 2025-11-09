// types.ts (or inline)
export type UploadAsset = {
    ok: boolean;
    filename: string;
    size?: number;
    mimetype: string;
    url: string;        // signed preview URL
    thumbUrl: string;   // same as url (for now)
    gcs_path: string;   // canonical object name in GCS
    cdn: "gcs-signed" | string;
};

export type ReplicateResponse = {
    status: string;
    results: {
        generation_id: string;
        gcs_path?: string;
        signed_url?: string;
        mimetype?: string;
        url?: string;
        error?: string | null;
    }[];
};