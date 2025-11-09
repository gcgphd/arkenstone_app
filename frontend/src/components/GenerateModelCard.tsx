import React, { useState } from "react";
import { Card, Typography, Button, notification, Grid } from "antd";
import { SendOutlined } from "@ant-design/icons";
import { send_generation_job } from "../services/jobsService";
import { UploadAsset } from '../types/types';
import PreviewPanel from "./PreviewPanel";
const { useBreakpoint } = Grid;

const { Title, Text } = Typography;

interface GenerateModelCardProps {
    imageSrc?: string;            // ultimate fallback
    title?: string;
    subtitle?: string;
    uid?: string | null;
    previewUrl?: string;          // shown first
    actionLabel?: string;
    loaderSrc?: string;           // optional custom loader
}

const GenerateModelCard: React.FC<GenerateModelCardProps> = ({
    imageSrc = "https://os.alipayobjects.com/rmsportal/QBnOOoLaAfKPirc.png",
    title = "YOURSELF HERE",
    subtitle = "Take a picture of yourself or upload it.",
    uid,
    previewUrl,
    actionLabel = "Generate",
    loaderSrc = "/assets/image-loader-light.gif",
}) => {
    const screens = useBreakpoint();
    const isMobile = !screens.sm;
    const [api, contextHolder] = notification.useNotification();
    const [isGenerating, setIsGenerating] = useState(false);
    const [modelUrl, setModelUrl] = useState<string | null>(null);
    const [modelAsset, setModelAsset] = useState<UploadAsset | null>(null);

    const handleGenerationSubmit = async () => {
        if (!uid) return console.error("No active user id");
        if (!previewUrl) return console.error("No preview url");

        setIsGenerating(true);
        try {
            const payload = { uid, file_inputs: [previewUrl] };
            const data = await send_generation_job(payload);

            console.log(data)

            // support either shape: results[0].result or results[0].url
            const resultItem =
                data?.results?.[0] ?? null;

            console.log("result item")
            console.log(resultItem)

            if ((data?.status === "succeeded" || data?.status === "success") && resultItem) {

                const resultUrl = resultItem.signed_url;
                setModelUrl(resultUrl);

                setModelAsset({
                    ok: true,
                    filename: resultItem.filename,
                    size: undefined,
                    mimetype: resultItem.mimetype,
                    url: resultItem.url,
                    thumbUrl: resultItem.url,
                    gcs_path: resultItem.gcs_path,
                    cdn: "gcs-signed",
                });

            } else {
                console.warn("Unexpected response:", data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const reset = () => { setModelUrl(null); setIsGenerating(false); };

    // decide what to show
    const displayedSrc = isGenerating
        ? loaderSrc
        : modelUrl || previewUrl || imageSrc;

    // If we have a preview, hide the upload card and show the image preview panel

    if (modelUrl) {
        return (
            <PreviewPanel
                previewUrl={modelUrl}
                initialAsset={modelAsset ?? undefined}
                onReset={reset}
                contextHolder={contextHolder}
                isMobile={isMobile}
            />);
    }


    return (
        <Card
            hoverable
            style={{
                width: 360,
                borderRadius: 16,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: 16,
            }}
        >
            <img
                draggable={false}
                alt={isGenerating ? "Generating…" : "Preview"}
                src={displayedSrc}
                style={{
                    maxWidth: "100%",
                    height: 220,
                    objectFit: "contain",
                    borderRadius: 12,
                    marginBottom: 16,
                    border: isGenerating ? "1px solid var(--ant-color-border)" : undefined,
                }}
            />

            <Title level={3}>{title}</Title>
            <Text type="secondary">{subtitle}</Text>

            <Button
                icon={!isGenerating ? <SendOutlined /> : undefined}
                iconPosition="end"
                onClick={handleGenerationSubmit}
                loading={isGenerating}
                disabled={isGenerating || !uid || !previewUrl}
                block
                style={{ marginTop: 16 }}
            >
                {isGenerating ? "Generating ..." : actionLabel}
            </Button>
        </Card>
    );
};

export default GenerateModelCard;

