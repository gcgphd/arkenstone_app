// ThumbnailGallery.tsx
import React from "react";
import type { ThumbItem } from "./ThumbnailRail";

type Props = {
    thumbnails: ThumbItem[];
    onClickThumb?: (thumb: ThumbItem) => void;
};

const ThumbnailGallery: React.FC<Props> = ({ thumbnails, onClickThumb }) => {
    return (
        <div
            style={{
                width: "100%",
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                padding: 16,
                background: "var(--ant-color-bg-container)",
                boxSizing: "border-box",
                overflow: "visible",
                alignSelf: "flex-start"

                // ⚠️ NO maxHeight
                // ⚠️ NO overflow hidden
                // ⚠️ NO limiting container
            }}
        >
            {thumbnails.map((t) => (
                <div
                    key={t.id}
                    onClick={() => onClickThumb?.(t)}
                    style={{
                        cursor: "pointer",
                        borderRadius: 8,
                        overflow: "visible",
                        border: "1px solid var(--ant-color-border)",
                        background: "#111",
                        flex: "0 0 auto",

                        // Allow natural image dimensions
                        display: "inline-block",
                    }}
                >
                    <img
                        src={t.src}
                        alt={t.alt}
                        style={{
                            display: "block",
                            width: "auto",
                            height: "auto",

                            // No scaling
                            maxWidth: "none",
                            maxHeight: "none",
                        }}
                        draggable={false}
                    />
                </div>
            ))}
        </div>
    );
};

export default ThumbnailGallery;
