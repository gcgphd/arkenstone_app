import React from "react";
import { Button, Grid, UploadFile } from "antd";
import { ReloadOutlined, SendOutlined } from "@ant-design/icons";
import GenerateCard from "./GenerateCard";
import ThumbnailRail, { ThumbItem } from "./ThumbnailRail"
import { BACKEND_URL } from "../config";
const { useBreakpoint } = Grid;

interface PreviewPanelProps {
  previewUrl: string;
  onReset: () => void;
  contextHolder?: React.ReactNode;
  isMobile?: boolean;
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


const PreviewPanel: React.FC<PreviewPanelProps> = ({
  previewUrl,
  onReset,
  contextHolder,
  isMobile: forcedMobile,
}) => {
  const screens = useBreakpoint();
  const isMobile = forcedMobile ?? !screens.sm;

  // ✅ Responsive width logic (no 100vw)
  const PREVIEW_PAD = isMobile ? 16 : 24;
  const MAX_W = 1000;

  const [galleryFiles, setGalleryFiles] = React.useState<UploadFile<any>[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isJobQueued, setIsJobQueued] = React.useState(false);
  const [thumbnails, setThumbnails] = React.useState<ThumbItem[]>([]);


  const addLoadingThumb = React.useCallback(() => {
    const id = `tmp-${Date.now()}`;
    setThumbnails((prev) => [
      { id, src: "/assets/image-loader-light.gif", alt: "Generating…", status: "loading" },
      ...prev,
    ]);
    return id;
  }, []);

  // Turn relative into absolute (adjust base to your backend origin)
  const toAbsolute = (u?: string) =>
    !u ? undefined : u.startsWith("http") ? u : `http://localhost:8080${u}`;

  // Your existing URL resolver (kept, with absolute fallback)
  const resolveUrl = (f: UploadFile<any>) => {
    if (f.url) return toAbsolute(f.url);
    const r =
      typeof f.response === "string" ? JSON.parse(f.response) : f.response;
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

  const handleSubmit = async () => {
    let thumbId: string | null = null;
    try {
      setIsLoading(true);
      return
      // 👈 add the loading GIF to the rail
      const res = await fetch(`${BACKEND_URL}/queue_generation_job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Backend error: ${res.status} ${txt}`);
      }
      // Optional: toast success
      const data = await res.json();
      console.log("Submitted:", payload);
      console.log(data);

    } catch (err) {
      console.error(err);
      // Optional: handle error

    } finally {
      setIsLoading(true)
      setIsJobQueued(true);
      //setIsLoading(false);
      thumbId = addLoadingThumb();
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

