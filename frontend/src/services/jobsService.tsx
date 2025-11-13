// services/jobsService.ts
import { BACKEND_URL } from "../config";


export async function getUserJobs(userId: string, opts?: { signal?: AbortSignal }) {
    const res = await fetch(`${BACKEND_URL}/jobs?uid=${userId}`, {
        signal: opts?.signal,
    });
    if (!res.ok) throw new Error(`Jobs fetch failed: ${res.status} ${await res.text()}`);
    return res.json(); // plain response
}


export const queue_generation_job = async (payload: any) => {
    const res = await fetch(`${BACKEND_URL}/queue_generation_job_test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Backend error: ${res.status} ${txt}`);
    }

    return await res.json();
};

// send a simple generation job without 
// queuing
export const send_generation_job = async (payload: any) => {
    const res = await fetch(`${BACKEND_URL}/send_generation_job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Backend error: ${res.status} ${txt}`);
    }

    return await res.json();
};



export async function deleteJob(uid: string, jobId: string): Promise<void> {
    const res = await fetch(`${BACKEND_URL}/api/delete_job`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            uid,
            jobid: jobId, // must match Flask: data.get("jobid")
        }),
    });

    let data: any = null;
    try {
        data = await res.json();
    } catch {
        // ignore JSON error, we'll fall back to generic message
    }

    if (!res.ok || data?.status === "fail") {
        const msg =
            data?.message || `Failed to delete job ${jobId}. HTTP ${res.status}`;
        throw new Error(msg);
    }
}

