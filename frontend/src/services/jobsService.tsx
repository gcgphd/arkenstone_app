// services/jobsService.ts
import { BACKEND_URL } from "../config";


export async function getUserJobs(userId: string, opts?: { signal?: AbortSignal }) {
    const res = await fetch(`${BACKEND_URL}/jobs?uid=${userId}`, {
        signal: opts?.signal,
    });
    if (!res.ok) throw new Error(`Jobs fetch failed: ${res.status} ${await res.text()}`);
    return res.json(); // plain response
}
