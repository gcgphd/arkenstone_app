// src/context/JobsContext.tsx
import React from "react";
import { useAuth } from "./AuthContext";
import { getUserJobs } from "../services/jobsService";
import { BACKEND_URL } from "../config";
import { pollingHelpers } from "../services/pollingService";
import type { ThumbItem } from "../components/ThumbnailRail";

// helpers you currently have in PreviewPanel
const normalizeJobs = (raw: any): any[] => {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.jobs)) return raw.jobs;
    if (raw?.jobs && typeof raw.jobs === "object") return Object.values(raw.jobs);
    if (raw && typeof raw === "object") return Object.values(raw);
    return [];
};

const toAbsolute = (u?: string | null) =>
    !u ? undefined : u.startsWith("http") ? u : `${BACKEND_URL}${u}`;

const jobToThumb = (j: any): ThumbItem => {
    const id = j?.id ?? j?.job_id ?? j?.uuid ?? "";
    const statusRaw = String(j?.status ?? "unknown").toLowerCase();

    const preview_url = j?.preview?.signed_url ?? undefined;
    const gallery_urls = Array.isArray(j?.gallery)
        ? j.gallery.map((g: any) => g?.signed_url).filter(Boolean)
        : [];

    // same best-image logic
    const best = pollingHelpers.extractBestImage(j);

    const status: ThumbItem["status"] =
        statusRaw === "succeeded"
            ? "ready"
            : pollingHelpers.isInProgress(statusRaw)
                ? "loading"
                : "error";

    return {
        id,
        src: best ? toAbsolute(best) ?? "" : "/assets/image-loader-light.gif",
        alt:
            status === "ready"
                ? "Generation complete"
                : status === "loading"
                    ? "Generating…"
                    : "Generation failed",
        status,
        job_id: j?.job_id ?? id,
        preview_url,
        gallery_urls,
    };
};

type JobsContextValue = {
    thumbnails: ThumbItem[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    addLoadingThumb: () => string;
    updateThumb: (id: string, changes: Partial<ThumbItem>) => void;
};

const JobsContext = React.createContext<JobsContextValue | undefined>(undefined);

export const JobsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { auth } = useAuth();
    const uid = auth?.uid;

    const [thumbnails, setThumbnails] = React.useState<ThumbItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const loadJobs = React.useCallback(
        async () => {
            if (!uid) return;

            setLoading(true);
            setError(null);

            try {
                const raw = await getUserJobs(uid);
                const jobs = normalizeJobs(raw);
                setThumbnails(jobs.map(jobToThumb));
            } catch (e: any) {
                console.error("Error fetching jobs", e);
                setError(e?.message || "Error fetching jobs");
            } finally {
                setLoading(false);
            }
        },
        [uid]
    );

    // load once whenever uid becomes available / changes
    React.useEffect(() => {
        if (!uid) {
            setThumbnails([]);
            return;
        }
        loadJobs();
    }, [uid, loadJobs]);

    // expose helpers similar to what you had in PreviewPanel
    const addLoadingThumb = React.useCallback(() => {
        const id = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setThumbnails(prev => [
            { id, src: "/assets/image-loader-light.gif", alt: "Generating…", status: "loading" },
            ...prev,
        ]);
        return id;
    }, []);

    const updateThumb = React.useCallback((id: string, changes: Partial<ThumbItem>) => {
        setThumbnails(prev => prev.map(t => (t.id === id ? { ...t, ...changes } : t)));
    }, []);

    const value: JobsContextValue = {
        thumbnails,
        loading,
        error,
        refetch: loadJobs,
        addLoadingThumb,
        updateThumb,
    };

    return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
};

export function useJobs() {
    const ctx = React.useContext(JobsContext);
    if (!ctx) throw new Error("useJobs must be used within a JobsProvider");
    return ctx;
}
