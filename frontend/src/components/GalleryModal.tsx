import React from "react";
import { Button, Modal, Spin, Grid, Image, Card, message } from "antd";
import { LoadingOutlined } from '@ant-design/icons';
import ThumbnailRail, { ThumbItem } from "./ThumbnailRail";
import ThumbnailGallery from "./ThumbnailGallery";
import ActionButtonGroup from "./ActionButtons";
import { downloadDirect, shareUrl } from "../services/shareService";
import { deleteJob } from "../services/jobsService";
import { useAuth } from "../context/AuthContext";
import { useNotify } from "../context/NotificationContext";

interface GalleryModalProps {
    thumbnails: ThumbItem[];
    gallery: boolean;
}

const { useBreakpoint } = Grid;

const GalleryModal: React.FC<GalleryModalProps> = ({ thumbnails, gallery }) => {
    const screens = useBreakpoint();
    const { auth } = useAuth();
    const notify = useNotify();

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

    // Local copy so we can remove items after delete
    const [items, setItems] = React.useState<ThumbItem[]>(thumbnails);

    // Keep local state in sync if parent changes the thumbnails
    React.useEffect(() => {
        setItems(thumbnails);
    }, [thumbnails]);

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

    const getBestUrl = (thumb?: ThumbItem | null) =>
        thumb?.src || thumb?.preview_url || thumb?.gallery_urls?.[0] || "";

    const handleDownload = () => {
        const url = getBestUrl(selectedThumb);
        if (!url) return;
        downloadDirect(url);
    };

    const handleShare = async () => {
        const url = getBestUrl(selectedThumb);
        if (!url) return;

        await shareUrl(url, {
            title: selectedThumb?.job_id
                ? `Image ${selectedThumb.job_id}`
                : "Shared image",
            text: "Check out this image",
            onSuccess: () => message.success("Shared successfully"),
            onCopy: () => message.success("Link copied to clipboard"),
            onOpenFallback: () => message.info("Opened in a new tab"),
            onError: () => message.error("Share failed"),
        });
    };

    const handleDelete = async () => {
        if (!selectedThumb?.job_id) {
            message.error("Missing job id for this thumbnail");
            return;
        }
        if (!auth?.uid) {
            message.error("User not authenticated");
            return;
        }

        try {
            setLoading(true);

            // Call backend
            await deleteJob(auth.uid, selectedThumb.job_id);

            // Remove from local gallery
            setItems((prev) =>
                prev.filter((t) => t.job_id !== selectedThumb.job_id)
            );

            // Close modal and clear selection
            setOpen(false);
            setSelectedThumb(null);

            message.success("Generation deleted successfully");
        } catch (err: any) {
            console.error(err);
            message.error(err?.message || "Failed to delete generation");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
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

            {/* Use local items, not raw thumbnails */}
            {gallery ? (
                <ThumbnailGallery thumbnails={items} onClickThumb={handleThumbClick} />
            ) : (
                <ThumbnailRail
                    thumbnails={items} onClickThumb={handleThumbClick}
                />
            )
            }

            <Modal
                open={open}
                onCancel={handleClose}
                width={modalWidth}
                footer={null}
                style={{ top: 16 }}
                styles={{
                    mask: {
                        backgroundColor: "rgba(0, 0, 0, 0.3)",
                        backdropFilter: "blur(8px)",
                    },
                    content: {
                        height: "90vh",
                        display: "flex",
                        flexDirection: "column",
                        background: "rgba(255, 255, 255, 0)",
                        backdropFilter: "blur(18px)",
                        WebkitBackdropFilter: "blur(18px)",
                        border: "1px solid rgba(255, 255, 255, 0)",
                        boxShadow: "0 8px 40px rgba(0, 0, 0, 0)",
                        borderRadius: 12,
                        color: "white",
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
                        <Spin tip="Deleting" indicator={<LoadingOutlined spin />} />
                    </div>
                ) : selectedThumb ? (
                    <>
                        {/* MAIN IMAGE */}
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
                                        borderRadius: 22,
                                    }}
                                />
                            ) : (
                                <p>No main image.</p>
                            )}
                        </div>

                        {/* SIDE PANEL */}
                        <div
                            style={{
                                flex: 2,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "100%",
                                minHeight: 0,
                                gap: 12,
                            }}
                        >
                            {/* ACTION BUTTONS */}
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
                                    onDelete={handleDelete}
                                    onShare={handleShare}
                                />
                            </div>

                            {/* GALLERY CARD */}
                            <Card
                                size="small"
                                style={{
                                    width: "50%",
                                    height: "100%",
                                    borderRadius: 12,
                                    display: "flex",
                                    flex: 1,
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


