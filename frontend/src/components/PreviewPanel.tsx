import React from "react";
import { Button, Grid, UploadFile } from "antd";
import { ReloadOutlined, CloudUploadOutlined } from "@ant-design/icons";
import GenerateCard from "./GenerateCard";

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
    try {
      const res = await fetch("http://localhost:8080/collect_media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Backend error: ${res.status} ${txt}`);
      }
      // Optional: toast success
      console.log("Submitted:", payload);
    } catch (err) {
      console.error(err);
      // Optional: toast error
    }
  };


  return (
    <div
      style={{
        width: "100%",
        maxWidth: MAX_W,
        height: "100svh", // fill visible viewport (safe for iOS)
        margin: "0 auto", // center horizontally
        boxSizing: "border-box", // padding included in width
        padding: PREVIEW_PAD,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden", // no horizontal scroll ever
        gap: 180
      }}
    >
      {contextHolder}

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
          maxWidth: "100%", // ensure image area shrinks with parent
        }}
      >
        <img
          src={previewUrl}
          alt="Preview"
          style={{
            width: "100%",
            height: "100%",
            maxHeight: "calc(100svh - 100px)", // ensure it fits between top and buttons
            objectFit: "contain",
          }}
          draggable={false}
        />
      </div>

      {/* BUTTON AREA */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 16,
          width: "100%",
        }}
      >
        <Button icon={<ReloadOutlined />} onClick={onReset} block>
          Choose another
        </Button>
        {/* <Button type="primary" block>Continue</Button> */}

        {/* Submit JSON payload */}
        <Button
          icon={<CloudUploadOutlined />}
          onClick={handleSubmit}
          disabled={!previewUrl || doneFiles.length === 0}
          block
        >
          Submit selection
        </Button>

        <GenerateCard
          fileList={galleryFiles}
          onFileListChange={setGalleryFiles}
        />

      </div>
    </div>
  );
};

export default PreviewPanel;

