// CustomUpload.tsx
import React, { useRef, useState, useCallback, useEffect } from "react";
import { Button, Progress, Typography } from "antd";
import { UploadOutlined } from "@ant-design/icons";

type CustomUploadProps = {
    action: string;
    name?: string;
    accept?: string;
    maxSizeMB?: number;
    beforeUpload?: (file: File) => boolean | Promise<boolean>;
    onSuccess?: (resp: any, file: File) => void;
    onError?: (err: any, file?: File) => void;
    onLocalPreview?: (objectUrl: string, file: File) => void; // 👈 NEW
    buttonText?: string;
    block?: boolean;
    withDrop?: boolean;
    deferPreviewUntilSuccess?: boolean;
};

const { Text } = Typography;

const CustomUpload: React.FC<CustomUploadProps> = ({
    action,
    name = "file",
    accept = "image/*",
    maxSizeMB = 20,
    beforeUpload,
    onSuccess,
    onError,
    onLocalPreview,
    buttonText = "Upload Media",
    block = true,
    withDrop = true,
    deferPreviewUntilSuccess = true,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);

    const pickFile = () => inputRef.current?.click();

    const maybeLocalPreview = (file: File) => {
        if (deferPreviewUntilSuccess) return;
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        onLocalPreview?.(url, file);
    };

    const startLocalPreview = (file: File) => {
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        onLocalPreview?.(url, file);
    };

    const uploadFile = useCallback(async (file: File) => {
        try {
            if (file.size / 1024 / 1024 > maxSizeMB) {
                throw new Error(`Max ${maxSizeMB}MB`);
            }
            if (beforeUpload) {
                const ok = await beforeUpload(file);
                if (!ok) return;
            }

            const form = new FormData();
            form.append(name, file);

            setUploading(true);
            setProgress(0);

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", action, true);

                xhr.upload.onprogress = (evt) => {
                    if (evt.lengthComputable) {
                        setProgress(Math.round((evt.loaded / evt.total) * 100));
                    }
                };

                xhr.onreadystatechange = () => {
                    if (xhr.readyState === 4) {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                const resp = xhr.responseText ? JSON.parse(xhr.responseText) : {};
                                onSuccess?.(resp, file);
                            } finally {
                                resolve();
                            }
                        } else {
                            onError?.(xhr.responseText || `HTTP ${xhr.status}`, file);
                            reject(new Error(xhr.responseText || `HTTP ${xhr.status}`));
                        }
                    }
                };

                xhr.onerror = () => {
                    onError?.("Network error", file);
                    reject(new Error("Network error"));
                };

                xhr.send(form);
            });
        } finally {
            setUploading(false);
            setProgress(0);
        }
    }, [action, beforeUpload, maxSizeMB, name, onError, onSuccess]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (uploading) return;
        const f = e.target.files?.[0];
        if (f) {
            maybeLocalPreview(f); // 👈 show instantly
            uploadFile(f);
        }
        e.target.value = "";
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) {
            startLocalPreview(f);
            uploadFile(f);
        }
    };

    const commonDropHandlers = withDrop
        ? {
            onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); },
            onDragLeave: () => setDragOver(false),
            onDrop: handleDrop,
        }
        : {};

    return (
        <div style={{ width: "100%" }}>
            {withDrop && (
                <div
                    {...commonDropHandlers}
                    onClick={pickFile}
                    style={{
                        width: "100%",
                        border: "1px dashed var(--ant-color-border)",
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 12,
                        textAlign: "center",
                        cursor: uploading ? "not-allowed" : "pointer",
                        background: dragOver ? "rgba(0,0,0,0.03)" : undefined,
                        transition: "background 0.15s",
                        opacity: uploading ? 0.6 : 1,
                    }}
                >
                    <Text type="secondary">
                        {uploading ? "Uploading…" : "Drop an image here or click to select"}
                    </Text>
                </div>
            )}

            {/* ✅ Primary, loading, disabled until upload completes */}
            <Button
                icon={!uploading ? <UploadOutlined /> : undefined}
                iconPosition="end"
                onClick={pickFile}
                loading={uploading}
                disabled={uploading}
                block={block}
            >
                {uploading ? "Loading" : buttonText}
            </Button>

            {uploading && (
                <div style={{ marginTop: 12 }}>
                    <Progress percent={progress} status="active" />
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                style={{ display: "none" }}
                onChange={handleInputChange}
                disabled={uploading}
            />
        </div>
    );
};

export default CustomUpload;
