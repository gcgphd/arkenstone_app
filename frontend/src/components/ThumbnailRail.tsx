import React from "react";

export type ThumbItem = {
    id: string;
    src: string;           // thumbnail URL (your GIF or final image)
    alt?: string;
    status?: "loading" | "ready" | "error";
};

type Props = {
    items: ThumbItem[];
    width?: number;        // px
    onClickThumb?: (id: string) => void;
};

const ThumbnailRail: React.FC<Props> = ({ items, width = 88, onClickThumb }) => {
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
            {items.length === 0 ? (
                <div
                    style={{
                        color: "var(--ant-color-text-tertiary)",
                        fontSize: 12,
                        textAlign: "center",
                        marginTop: 8,
                    }}
                >
                    No thumbnails yet
                </div>
            ) : (
                items.map((t) => (
                    <div
                        key={t.id}
                        onClick={() => onClickThumb?.(t.id)}
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
                            alt={t.alt || ""}
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