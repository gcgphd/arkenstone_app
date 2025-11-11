import React from "react";
import { Button, Grid, UploadFile } from "antd";
import { ReloadOutlined, SendOutlined } from "@ant-design/icons";
import GenerateCard from "./GenerateCard";
import ThumbnailRail, { ThumbItem } from "./ThumbnailRail"
import GalleryModal from "./GalleryModal";
import { BACKEND_URL } from "../config";
const { useBreakpoint } = Grid;
import { useJobPolling } from "../services/useJobPolling";
import { pollingHelpers } from "../services/pollingService";
import { getUserJobs } from "../services/jobsService";
import { useAuth } from "../context/AuthContext";
import { UploadAsset } from '../types/types';
import { queue_generation_job } from "../services/jobsService";


interface PreviewPanelProps {
  previewUrl: string;
  initialAsset?: UploadAsset;
  onReset: () => void;
  contextHolder?: React.ReactNode;
  isMobile?: boolean;
  userId?: string;
}

// helper: normalize response to an array of raw jobs
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

  // keep your existing best-image logic as the visible src
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


const toAbsolute = (u?: string | null) =>
  !u ? undefined : u.startsWith("http") ? u : `${BACKEND_URL}${u}`;


const PreviewPanel: React.FC<PreviewPanelProps> = ({
  previewUrl,
  initialAsset,
  onReset,
  contextHolder,
  isMobile: forcedMobile
}) => {


  const { auth } = useAuth();
  const screens = useBreakpoint();
  const isMobile = forcedMobile ?? !screens.sm;

  // ✅ Responsive width logic (no 100vw)
  const PREVIEW_PAD = isMobile ? 16 : 24;
  const MAX_W = 1000;

  const [galleryFiles, setGalleryFiles] = React.useState<UploadFile<any>[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [thumbnails, setThumbnails] = React.useState<ThumbItem[]>([]);


  const jobThumbRef = React.useRef<Map<string, string>>(new Map()); // jobId -> thumbId
  const didInitRef = React.useRef(false);
  const mountedRef = React.useRef(true);


  // Get User Id from app context orlocal storage.
  const activeUserId = React.useMemo(() => {
    // ✅ priority 1: uid from context
    if (auth?.uid) return auth.uid;

    // ✅ priority 2: fallback to localStorage (in rare cases, e.g. page reload before context restored)
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("uid");
      return stored ?? undefined;
    }

    return undefined;
  }, [auth?.uid]);

  const addLoadingThumb = React.useCallback(() => {
    const id = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setThumbnails((prev) => [
      { id, src: "/assets/image-loader-light.gif", alt: "Generating…", status: "loading" },
      ...prev,
    ]);
    return id;
  }, []);

  const updateThumb = React.useCallback((id: string, changes: Partial<ThumbItem>) => {
    setThumbnails((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  }, []);



  const doneFiles = React.useMemo(
    () => galleryFiles.filter((f) => f.status === "done"),
    [galleryFiles]
  );

  // --- use the shared polling service via a hook
  const { startPolling /*, stopPolling, stopAllPolling*/ } = useJobPolling(
    React.useCallback(({ jobId, status, data }) => {
      const thumbId = jobThumbRef.current.get(jobId);
      if (!thumbId) return;

      if (status === "succeeded") {
        const img = toAbsolute(data?._bestImage) || "/assets/check-circle.svg";

        // extract the same fields as above if present in the poll payload
        const preview_url = data?.preview?.signed_url ?? undefined;
        const gallery_urls = Array.isArray(data?.gallery)
          ? data.gallery.map((g: any) => g?.signed_url).filter(Boolean)
          : [];

        console.log("data", data)
        console.log("gallery urls", gallery_urls)

        updateThumb(thumbId, {
          src: img,
          alt: "Generation complete",
          status: "ready",
          job_id: jobId,
          preview_url,
          gallery_urls,
        });

        jobThumbRef.current.delete(jobId);

      } else if (status === "failed" || status === "canceled") {
        updateThumb(thumbId, { alt: "Generation failed", status: "error", job_id: jobId });
        jobThumbRef.current.delete(jobId);

      } else if (pollingHelpers.isInProgress(status)) {
        // optional: set a progress label/spinner if you want
      }
    }, [updateThumb])
  );



  // ------- This part is used to update the Thumbanail images  on first run


  // keep startPolling in a ref so the init effect 
  // doesn't re-run when its identity changes
  const startPollingRef = React.useRef(startPolling);
  React.useEffect(() => {
    startPollingRef.current = startPolling;
  }, [startPolling]);


  // set true on real mount, false on unmount
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);


  React.useEffect(() => {
    console.log("Init Gallery");
    console.log("didInit before:", didInitRef.current, "activeUserId:", activeUserId);

    if (didInitRef.current) return;
    if (!activeUserId) return;

    didInitRef.current = true; // lock

    (async () => {
      try {
        const raw = await getUserJobs(activeUserId);

        // 🔐 double-check mount right before updating state
        if (!mountedRef.current) {
          console.log("Skip update: unmounted");
          return;
        }

        const jobs = normalizeJobs(raw);

        // add logs to prove it runs
        console.log("About to set thumbnails", jobs.length);

        setThumbnails(jobs.map(jobToThumb));

        jobs.forEach((j: any) => {
          const id = j?.id ?? j?.job_id ?? j?.uuid;
          const status = String(j?.status ?? "").toLowerCase();
          if (id && pollingHelpers.isInProgress(status)) {
            jobThumbRef.current.set(id, id);
            startPollingRef.current(id, activeUserId);
          }
        });
      } catch (e: unknown) {
        if ((e as any)?.name !== "AbortError") console.error("Error loading jobs", e);
      }
    })();
  }, [activeUserId]);



  // ---- enqueue a new job; start its independent poller

  // handle for payload
  const safeParse = (v: any) => {
    if (typeof v !== "string") return v;
    try { return JSON.parse(v); } catch { return undefined; }
  };

  // build the payload to send to enqueue job
  const payload = React.useMemo(
    () => ({
      uid: activeUserId,
      preview: initialAsset,
      gallery: doneFiles.map(f => safeParse((f as any).response)).filter(Boolean),
    }),
    [activeUserId, initialAsset, doneFiles]
  );

  // submit the job
  const handleSubmit = async () => {

    if (!activeUserId) {
      console.error("No active user id");
      return; // or show a message
    }

    setIsLoading(true);
    try {

      // send the generation job
      const data = await queue_generation_job(payload);

      // expected: { job_id, status: "queued", ok: true }
      const jobId = String(data?.job_id);
      if (!jobId) throw new Error("Missing job_id in enqueue response");

      // create a loading thumb for this job
      const thumbId = addLoadingThumb();
      jobThumbRef.current.set(jobId, thumbId);

      // attach job_id to that temp thumb now
      updateThumb(thumbId, { job_id: jobId });

      // start polling for just this job
      startPolling(jobId, activeUserId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false); // only covers the POST
    }
  };


  return (
    <div
      style={{
        width: "100%",
        maxWidth: MAX_W,
        height: "100svh",
        margin: "0 auto",
        boxSizing: "border-box",
        padding: PREVIEW_PAD,
        display: "flex",
        gap: 12,
        overflow: "hidden",
      }}
    >
      {contextHolder}

      {/* LEFT: main preview + controls */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* IMAGE AREA */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: 8,
            border: "1px solid var(--ant-color-border)",
            background: "var(--ant-color-bg-container)",
            maxWidth: "100%",
          }}
        >

          {isLoading ? (
            <img
              src="/assets/image-loader-light.gif"
              alt="Loading"
              style={{ width: "50%", border: "1px solid var(--ant-color-border)", borderRadius: 22, objectFit: "contain", verticalAlign: "middle" }} //height: 24, width: 24
            />
          ) : (
            <img
              src={previewUrl}
              alt="Preview"
              style={{ width: "100%", height: "100%", maxHeight: "calc(100svh - 100px)", objectFit: "contain" }}
              draggable={false}
            />
          )}

        </div>

        {/* BUTTONS + GENERATE CARD */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <Button
              icon={!isLoading ? <SendOutlined /> : undefined}
              onClick={handleSubmit}
              disabled={isLoading} //!previewUrl || doneFiles.length === 0 || 
              block
            //style={{ height: 48 }}
            >
              Generate
            </Button>

            <Button icon={<ReloadOutlined />} onClick={onReset} block disabled={isLoading}>
              Choose another
            </Button>
          </div>

          <GenerateCard uId={activeUserId} fileList={galleryFiles} onFileListChange={setGalleryFiles} />
        </div>
      </div>

      <GalleryModal thumbnails={thumbnails} />
    </div>
  );
};

export default PreviewPanel;

