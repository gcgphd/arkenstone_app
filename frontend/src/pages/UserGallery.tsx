import React from "react";
import { Spin, Empty } from "antd";
import { LoadingOutlined } from '@ant-design/icons';
import GalleryModal from "../components/GalleryModal"
import type { ThumbItem } from "../components/ThumbnailRail";
import { useAuth } from "../context/AuthContext";
import { getUserJobs } from "../services/jobsService";
import { useJobPolling } from "../services/useJobPolling";
import { pollingHelpers } from "../services/pollingService";
import { BACKEND_URL } from "../config";

/** Optional props: override user and control polling */
interface UserGalleryModalProps {
    userId?: string;
    autoPoll?: boolean; // default true
}

/* ------------ small helpers (kept local for portability) ------------ */

const toAbsolute = (u?: string | null) =>
    !u ? undefined : u.startsWith("http") ? u : `${BACKEND_URL}${u}`;

// normalize various backend shapes into an array of jobs
const normalizeJobs = (raw: any): any[] => {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.jobs)) return raw.jobs;
    if (raw?.jobs && typeof raw.jobs === "object") return Object.values(raw.jobs);
    if (raw && typeof raw === "object") return Object.values(raw);
    return [];
};

const jobToThumb = (j: any): ThumbItem => {
    const id = j?.id ?? j?.job_id ?? j?.uuid ?? "";
    const status = String(j?.status ?? "unknown").toLowerCase();

    const preview_url = j?.preview?.signed_url ?? undefined;
    const gallery_urls = Array.isArray(j?.gallery)
        ? j.gallery.map((g: any) => g?.signed_url).filter(Boolean)
        : [];

    const best = pollingHelpers.extractBestImage(j);
    return {
        id,
        src: best ? toAbsolute(best) ?? "" : "/assets/image-loader-light.gif",
        alt:
            status === "succeeded"
                ? "Generation complete"
                : pollingHelpers.isInProgress(status)
                    ? "Generating…"
                    : "Generation failed",
        status:
            status === "succeeded"
                ? "ready"
                : pollingHelpers.isInProgress(status)
                    ? "loading"
                    : "error",
        job_id: j?.job_id ?? id,
        preview_url,
        gallery_urls,
    };
};

/* ------------------------- Component ------------------------- */

const UserGalleryModal: React.FC<UserGalleryModalProps> = ({ userId, autoPoll = true }) => {
    const { auth } = useAuth();

    // Resolve active user id: prop > context > localStorage
    const activeUserId = React.useMemo(() => {
        if (userId) return userId;
        if (auth?.uid) return auth.uid;
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("uid");
            return stored ?? undefined;
        }
        return undefined;
    }, [userId, auth?.uid]);

    const [thumbnails, setThumbnails] = React.useState<ThumbItem[]>([]);
    const [loading, setLoading] = React.useState<boolean>(true);
    const mountedRef = React.useRef(true);

    // track jobId -> thumbId (here they’re identical)
    const jobThumbRef = React.useRef<Map<string, string>>(new Map());

    // Polling hook
    const { startPolling } = useJobPolling(
        React.useCallback(({ jobId, status, data }) => {
            const thumbId = jobThumbRef.current.get(jobId);
            if (!thumbId) return;

            if (status === "succeeded") {
                const img = toAbsolute(data?._bestImage) || "/assets/check-circle.svg";
                const preview_url = data?.preview?.signed_url ?? undefined;
                const gallery_urls = Array.isArray(data?.gallery)
                    ? data.gallery.map((g: any) => g?.signed_url).filter(Boolean)
                    : [];

                setThumbnails(prev =>
                    prev.map(t =>
                        t.id === thumbId
                            ? {
                                ...t,
                                src: img,
                                alt: "Generation complete",
                                status: "ready",
                                job_id: jobId,
                                preview_url,
                                gallery_urls,
                            }
                            : t
                    )
                );
                jobThumbRef.current.delete(jobId);
            } else if (status === "failed" || status === "canceled") {
                setThumbnails(prev =>
                    prev.map(t => (t.id === thumbId ? { ...t, alt: "Generation failed", status: "error", job_id: jobId } : t))
                );
                jobThumbRef.current.delete(jobId);
            }
        }, [])
    );

    // keep startPolling fresh
    const startPollingRef = React.useRef(startPolling);
    React.useEffect(() => {
        startPollingRef.current = startPolling;
    }, [startPolling]);

    // mount/unmount guard
    React.useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // initial load of jobs -> thumbnails, and start polling for in-progress
    React.useEffect(() => {
        (async () => {
            if (!activeUserId) {
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const raw = await getUserJobs(activeUserId);
                if (!mountedRef.current) return;

                const jobs = normalizeJobs(raw);
                const thumbs = jobs.map(jobToThumb);
                setThumbnails(thumbs);

                if (autoPoll) {
                    jobs.forEach((j: any) => {
                        const id = j?.id ?? j?.job_id ?? j?.uuid;
                        const status = String(j?.status ?? "").toLowerCase();
                        if (id && pollingHelpers.isInProgress(status)) {
                            jobThumbRef.current.set(id, id);
                            startPollingRef.current(id, activeUserId);
                        }
                    });
                }
            } catch (e) {
                console.error("Error loading jobs", e);
            } finally {
                if (mountedRef.current) setLoading(false);
            }
        })();
    }, [activeUserId, autoPoll]);

    if (loading) {
        return (
            <div style={{ width: "100%", height: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Spin tip="Loading Gallery" indicator={<LoadingOutlined spin />} />
            </div>
        );
    }

    if (!thumbnails.length) {
        return (
            <div style={{ width: "100%", height: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Empty description="No jobs yet" />
            </div>
        );
    }

    // ✅ Only the gallery modal, fed by this component’s thumbnails state
    return <GalleryModal thumbnails={thumbnails} gallery={true} />;
};

export default UserGalleryModal;