import React from "react";
import { Button, Grid, UploadFile } from "antd";
import { ReloadOutlined, SendOutlined } from "@ant-design/icons";
import GenerateCard from "./GenerateCard";
import ThumbnailRail, { ThumbItem } from "./ThumbnailRail"
import { BACKEND_URL } from "../config";
const { useBreakpoint } = Grid;
import { useJobPolling } from "../services/useJobPolling";
import { pollingHelpers } from "../services/pollingService";
import { getUserJobs } from "../services/jobsService";


interface PreviewPanelProps {
  previewUrl: string;
  onReset: () => void;
  contextHolder?: React.ReactNode;
  isMobile?: boolean;
  userId?: string;
}

interface BackendPayload {
  preview: {
    url: string; // the big preview image shown at the top
  };
  gallery: {
    urls: string[];          // final, absolute URLs (server response or file.url)
    previewUrls: string[];   // UI previews (thumbUrl or best fallback)
    names: string[];
    sizes: number[];         // bytes (0 if unknown)
    mimeTypes: string[];     // best-effort from file.type
    uids: string[];          // UploadFile uid
  };
}


// helper: normalize response to an array of raw jobs
const normalizeJobs = (raw: any): any[] => {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.jobs)) return raw.jobs;
  if (raw?.jobs && typeof raw.jobs === "object") return Object.values(raw.jobs);
  if (raw && typeof raw === "object") return Object.values(raw);
  return [];
};

// parse a single raw job -> ThumbItem (uses your extractBestImage)
const jobToThumb = (j: any): ThumbItem => {
  const id = j?.id ?? j?.job_id ?? j?.uuid ?? "";
  const status = String(j?.status ?? "unknown").toLowerCase();
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
  };
};


const toAbsolute = (u?: string | null) =>
  !u ? undefined : u.startsWith("http") ? u : `${BACKEND_URL}${u}`;


const PreviewPanel: React.FC<PreviewPanelProps> = ({
  previewUrl,
  onReset,
  contextHolder,
  isMobile: forcedMobile,
  userId
}) => {
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


  // Get User Id from local storage.
  // to upgrade with context
  const activeUserId = React.useMemo(
    () => userId ?? (typeof window !== "undefined" ? localStorage.getItem("uid") ?? undefined : undefined),
    [userId]
  );


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


  // Your existing URL resolver (kept, with absolute fallback)
  const resolveUrl = (f: UploadFile<any>) => {
    if (f.url) return toAbsolute(f.url);
    const r = typeof f.response === "string" ? JSON.parse(f.response) : f.response;
    if (r?.url) return toAbsolute(r.url);
    return undefined;
  };

  // Try to get a preview (thumb) URL; fall back to url/response or even object URL if needed
  const resolvePreviewUrl = (f: UploadFile<any>) => {
    if (f.thumbUrl) return toAbsolute(f.thumbUrl);
    const fromFinal = resolveUrl(f);
    if (fromFinal) return fromFinal;
    // As a last resort, attempt a local object URL (only during this session)
    const fileObj = f.originFileObj as File | undefined;
    if (fileObj) {
      try {
        return URL.createObjectURL(fileObj);
      } catch {
        /* ignore */
      }
    }
    return undefined;
  };

  const doneFiles = React.useMemo(
    () => galleryFiles.filter((f) => f.status === "done"),
    [galleryFiles]
  );


  // Build the full payload you’ll POST to your backend
  const payload: BackendPayload = React.useMemo(
    () => ({
      preview: {
        url: previewUrl,
      },
      gallery: {
        urls: doneFiles.map((f) => resolveUrl(f) ?? "").filter(Boolean),
        previewUrls: doneFiles
          .map((f) => resolvePreviewUrl(f) ?? "")
          .filter(Boolean),
        names: doneFiles.map((f) => f.name ?? ""),
        sizes: doneFiles.map(
          (f) => (f.size as number | undefined) ?? f.originFileObj?.size ?? 0
        ),
        mimeTypes: doneFiles.map(
          (f) => f.type ?? f.originFileObj?.type ?? ""
        ),
        uids: doneFiles.map((f) => f.uid),
      },
    }),
    [previewUrl, doneFiles]
  );

  // --- use the shared polling service via a hook
  const { startPolling /*, stopPolling, stopAllPolling*/ } = useJobPolling(
    React.useCallback(({ jobId, status, data }) => {
      const thumbId = jobThumbRef.current.get(jobId);
      if (!thumbId) return;

      if (status === "succeeded") {
        const img = toAbsolute(data?._bestImage) || "/assets/check-circle.svg";
        updateThumb(thumbId, { src: img, alt: "Generation complete", status: "ready" });
        jobThumbRef.current.delete(jobId);
      } else if (status === "failed" || status === "canceled") {
        updateThumb(thumbId, { alt: "Generation failed", status: "error" });
        jobThumbRef.current.delete(jobId);
      } else if (pollingHelpers.isInProgress(status)) {
        // optional: set a progress label/spinner if you want
      }
    }, [updateThumb])
  );


  //////////// This part is used to update the Thumbanail images 
  // on first run

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
        console.log("User Jobs", raw);

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
            startPollingRef.current(id);
          }
        });
      } catch (e: unknown) {
        if ((e as any)?.name !== "AbortError") console.error("Error loading jobs", e);
      }
    })();
  }, [activeUserId]);



  // ---- enqueue a new job; start its independent poller
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/queue_generation_job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Backend error: ${res.status} ${txt}`);
      }
      // expected: { job_id, status: "queued", ok: true }
      const data: any = await res.json();
      const jobId = String(data?.job_id);
      if (!jobId) throw new Error("Missing job_id in enqueue response");

      // create a loading thumb for this job
      const thumbId = addLoadingThumb();
      jobThumbRef.current.set(jobId, thumbId);

      // start polling for just this job
      startPolling(jobId);
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

          <GenerateCard fileList={galleryFiles} onFileListChange={setGalleryFiles} />
        </div>
      </div>

      {/* RIGHT: thumbnail rail */}
      <ThumbnailRail
        items={thumbnails}
        width={88}
        onClickThumb={(id) => console.log("thumb clicked:", id)}
      />
    </div>
  );
};

export default PreviewPanel;

