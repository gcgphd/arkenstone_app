// pollingService.ts
import { BACKEND_URL } from "../config";

type PollHandle = { abort: AbortController; timerId: number | null; delay: number };
type Listener = (evt: { jobId: string; status: string; data: any }) => void;

const JOB_STATUS_PATH = "/job_status";

// --- helpers (no heavy interfaces)
const buildJobStatusUrl = (jobId: string) =>
    `${BACKEND_URL}${JOB_STATUS_PATH}?job_id=${encodeURIComponent(jobId)}`;

const getStatus = (js: any) => String(js?.status ?? "").toLowerCase();

const isInProgress = (s: string) =>
    s === "created" || s === "queued" || s === "starting" || s === "processing" || s === "running";

const extractBestImage = (js: any): string | undefined => {
    const fromResults = js?.results?.items?.[0]?.urls?.[0];
    if (fromResults) return fromResults;
    const fromPreviewAbs = js?.gallery?.items?.[0]?.previewUrl?.absolute;
    if (fromPreviewAbs) return fromPreviewAbs;
    const fromUrlAbs = js?.gallery?.items?.[0]?.url?.absolute;
    if (fromUrlAbs) return fromUrlAbs;
    const fromPreviewField = js?.preview?.url?.absolute;
    if (fromPreviewField) return fromPreviewField;
    return undefined;
};

class PollingService {
    private polls = new Map<string, PollHandle>();
    private listeners = new Set<Listener>();

    subscribe(fn: Listener) {
        this.listeners.add(fn);
        return () => this.listeners.delete(fn);
    }

    private emit(jobId: string, status: string, data: any) {
        for (const fn of this.listeners) fn({ jobId, status, data });
    }

    start(jobId: string) {
        if (!jobId || this.polls.has(jobId)) return;

        const handle: PollHandle = { abort: new AbortController(), timerId: null, delay: 1500 };
        this.polls.set(jobId, handle);

        const pollOnce = async () => {
            const h = this.polls.get(jobId);
            if (!h) return;
            try {
                const resp = await fetch(buildJobStatusUrl(jobId), { signal: h.abort.signal });
                if (!resp.ok) throw new Error(`Status ${resp.status}`);
                const js: any = await resp.json();
                const status = getStatus(js);

                this.emit(jobId, status, {
                    ...js,
                    _bestImage: extractBestImage(js),
                });

                if (status === "succeeded" || status === "failed" || status === "canceled") {
                    if (h.timerId) window.clearTimeout(h.timerId);
                    h.abort.abort();
                    this.polls.delete(jobId);
                    return;
                }

                h.delay = Math.min(10000, Math.round(h.delay * 1.5));
                h.timerId = window.setTimeout(pollOnce, isInProgress(status) ? h.delay : 3000);
            } catch (e: any) {
                if (e?.name === "AbortError") return;
                const h2 = this.polls.get(jobId);
                if (!h2) return;
                h2.delay = Math.min(10000, Math.round(h2.delay * 1.5));
                h2.timerId = window.setTimeout(pollOnce, h2.delay);
            }
        };

        handle.timerId = window.setTimeout(pollOnce, handle.delay);
    }

    stop(jobId: string) {
        const h = this.polls.get(jobId);
        if (!h) return;
        if (h.timerId) window.clearTimeout(h.timerId);
        h.abort.abort();
        this.polls.delete(jobId);
    }

    stopAll() {
        this.polls.forEach((h) => {
            if (h.timerId) window.clearTimeout(h.timerId);
            h.abort.abort();
        });
        this.polls.clear();
    }
}

export const pollingService = new PollingService();

// export helpers if other UIs need them
export const pollingHelpers = { getStatus, extractBestImage, isInProgress };
