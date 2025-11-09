import React from "react";

export type ThumbItem = {
    id: string;
    src: string;           // thumbnail URL (your GIF or final image)
    alt?: string;
    status?: "loading" | "ready" | "error";
    job_id?: string;            // optional if not always set
    preview_url?: string;
    gallery_urls?: string[];
};

type Props = {
    width?: number;        // px
    thumbnails: ThumbItem[];
    onClickThumb?: (thumb: ThumbItem) => void;
};

const ThumbnailRail: React.FC<Props> = ({ thumbnails, width = 88, onClickThumb }) => {
    return (
        <div
            style={{
                width,
                minWidth: width,
                maxWidth: width,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                overflowY: "auto",
                borderLeft: "1px solid var(--ant-color-border)",
                padding: 8,
                boxSizing: "border-box",
                background: "var(--ant-color-bg-container)",
            }}
        >
            {thumbnails.length === 0 ? (
                <div
                    style={{
                        color: "var(--ant-color-text-tertiary)",
                        fontSize: 12,
                        textAlign: "center",
                        marginTop: 8,
                    }}
                >
                </div>
            ) : (
                thumbnails.map((t) => (
                    <div
                        key={t.id}
                        style={{
                            width: "100%",
                            aspectRatio: "1 / 1",
                            borderRadius: 8,
                            overflow: "hidden",
                            border: "1px solid var(--ant-color-border)",
                            cursor: onClickThumb ? "pointer" : "default",
                            position: "relative",
                            background: "#f5f5f5",
                        }}
                        title={t.alt || ""}
                    >
                        <img
                            src={t.src}
                            alt={t.alt}
                            onClick={() => onClickThumb?.(t)}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            draggable={false}
                        />
                        {t.status === "loading" && (
                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    background: "rgba(255,255,255,0.35)",
                                }}
                            />
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

export default ThumbnailRail;