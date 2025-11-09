import React from "react";
import { Button, Modal, Spin, Grid, Image, Card, Radio, Tooltip, FloatButton } from "antd";
import { DeleteOutlined, ShareAltOutlined, DownloadOutlined } from "@ant-design/icons";
import ThumbnailRail, { ThumbItem } from "./ThumbnailRail";
import ActionButtonGroup from "./ActionButtons";

interface GalleryModalProps {
    thumbnails: ThumbItem[];
}

const { useBreakpoint } = Grid;

const GalleryModal: React.FC<GalleryModalProps> = ({ thumbnails }) => {
    const screens = useBreakpoint();

    const modalWidth = React.useMemo(() => {
        if (screens.xxl) return "60%";
        if (screens.xl) return "50%";
        if (screens.lg) return "60%";
        if (screens.md) return "70%";
        if (screens.sm) return "80%";
        return "90%";
    }, [screens]);

    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [selectedThumb, setSelectedThumb] = React.useState<ThumbItem | null>(null);

    const handleThumbClick = (thumb: ThumbItem) => {
        setSelectedThumb(thumb);
        setOpen(true);
        setLoading(true);
        setTimeout(() => setLoading(false), 300);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedThumb(null);
    };

    const handleDownload = async () => {
        if (!selectedThumb?.src) return;

        try {
            const response = await fetch(selectedThumb.src, { mode: "cors" });
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = blobUrl;

            // Optional: smarter filename
            const filename =
                selectedThumb.job_id ??
                selectedThumb.src.split("/").pop()?.split("?")[0] ??
                "download.jpg";
            link.download = filename;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Cleanup
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed:", error);
        }
    };

    const handleDelete = () => {
        console.log("Delete clicked");
        // add your delete logic here
    };

    const handleShare = () => {
        console.log("Share clicked");
        // add your share logic here
    };

    return (
        <>
            {/* CSS: make AntD <Image> thumbnails square and cover their box */}
            <style>{`
        .square-thumb {
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-radius: 8px;
        }
        .square-thumb .ant-image-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

                

      `}</style>

            <ThumbnailRail thumbnails={thumbnails} onClickThumb={handleThumbClick} />

            <Modal
                open={open}
                onCancel={handleClose}
                width={modalWidth}
                footer={null}
                style={{ top: 16 }}
                styles={{
                    mask: {
                        backgroundColor: "rgba(0, 0, 0, 0.3)",  // faint dark overlay behind everything
                        backdropFilter: "blur(8px)",             // blur the page behind modal
                    },
                    content: {
                        height: "90vh",
                        display: "flex",
                        flexDirection: "column",
                        background: "rgba(255, 255, 255, 0)", // translucent white layer
                        backdropFilter: "blur(18px)",            // strong internal blur
                        WebkitBackdropFilter: "blur(18px)",      // Safari support
                        border: "1px solid rgba(255, 255, 255, 0)",
                        boxShadow: "0 8px 40px rgba(0, 0, 0, 0)",
                        borderRadius: 12,
                        color: "white",                          // readable text on translucent bg
                    },
                    header: {
                        background: "transparent",
                        borderBottom: "none",
                        color: "white",
                    },
                    body: {
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 24,
                        overflow: "hidden",
                        minHeight: 0,
                        background: "transparent",
                        color: "white",
                    },
                    footer: {
                        background: "transparent",
                        borderTop: "none",
                    },
                }}
            >
                {loading ? (
                    <div
                        style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 0,
                        }}
                    >
                        <Spin size="large" />
                    </div>
                ) : selectedThumb ? (
                    <>
                        {/* MAIN IMAGE AREA (70%) */}
                        <div
                            style={{
                                flex: 8,
                                minHeight: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                borderRadius: 8,
                            }}
                        >
                            {selectedThumb.src ? (
                                <img
                                    src={selectedThumb.src}
                                    alt="Main Preview"
                                    style={{
                                        maxWidth: "100%",
                                        maxHeight: "100%",
                                        objectFit: "contain",
                                        display: "block",
                                    }}
                                />
                            ) : (
                                <p>No main image.</p>
                            )}
                        </div>

                        {/* GALLERY CARD AREA (30%) */}
                        <div
                            style={{
                                flex: 2,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "100%",
                                minHeight: 0,                   // <— critical for this section
                                gap: 12,
                            }}
                        >
                            {/* --- ACTION BUTTONS (Radio Group) --- */}
                            <div
                                style={{
                                    width: "50%",
                                    display: "flex",
                                    justifyContent: "start",
                                    alignItems: "center",
                                }}
                            >
                                <ActionButtonGroup
                                    onDownload={handleDownload}
                                    onDelete={() => console.log("Delete")}
                                    onShare={() => console.log("Share")}
                                />
                            </div>

                            {/* --- GALLERY CARD --- */}

                            <Card
                                size="small"
                                style={{
                                    width: "50%",
                                    height: "100%",
                                    borderRadius: 12,
                                    display: "flex",
                                    flex: 1,                        // <— fill leftover space
                                    minHeight: 0,
                                    justifyContent: "center",
                                    alignItems: "center",
                                }}
                                styles={{
                                    body: {
                                        display: "flex",
                                        flexDirection: "row",
                                        alignItems: "stretch",
                                        gap: 8,
                                        height: "100%",
                                        minHeight: 0,
                                        width: "100%",
                                        padding: 12,
                                        overflowX: "auto",
                                        overflowY: "hidden",
                                        whiteSpace: "nowrap",
                                    },
                                }}
                            >
                                {/* Preview image */}
                                {selectedThumb?.preview_url && (
                                    <div
                                        style={{
                                            height: "100%",
                                            aspectRatio: "1 / 1",
                                            flex: "0 0 auto",
                                        }}
                                    >
                                        <Image
                                            src={selectedThumb.preview_url}
                                            alt="Preview"
                                            preview={true}
                                            rootClassName="square-thumb"
                                            style={{ width: "100%", height: "100%" }}
                                        />
                                    </div>
                                )}

                                {/* Gallery images */}
                                {selectedThumb?.gallery_urls?.length ? (
                                    selectedThumb.gallery_urls.map((url, i) => (
                                        <div
                                            key={`${url}-${i}`}
                                            style={{
                                                height: "100%",
                                                aspectRatio: "1 / 1",
                                                flex: "0 0 auto",
                                            }}
                                        >
                                            <Image
                                                src={url}
                                                alt={`Gallery ${i + 1}`}
                                                preview={true}
                                                rootClassName="square-thumb"
                                                style={{ width: "100%", height: "100%" }}
                                            />
                                        </div>
                                    ))
                                ) : !selectedThumb?.preview_url ? (
                                    <p style={{ margin: 0 }}>No gallery images.</p>
                                ) : null}
                            </Card>
                        </div>
                    </>
                ) : (
                    <p>No job selected.</p>
                )}
            </Modal>
        </>
    );
};

export default GalleryModal;

