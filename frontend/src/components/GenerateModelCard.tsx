import React, { useState } from "react";
import { Button, notification, Grid } from "antd";
import { SendOutlined, ReloadOutlined } from "@ant-design/icons";
import { send_generation_job } from "../services/jobsService";
import { UploadAsset } from '../types/types';
import PreviewPanel from "./PreviewPanel";
const { useBreakpoint } = Grid;


interface GenerateModelCardProps {
    imageSrc?: string;            // ultimate fallback
    title?: string;
    subtitle?: string;
    uid?: string | null;
    previewUrl?: string;          // shown first
    actionLabel?: string;
    loaderSrc?: string;           // optional custom loader
    onResetAll?: () => void;
}

const GenerateModelCard: React.FC<GenerateModelCardProps> = ({
    imageSrc = "https://os.alipayobjects.com/rmsportal/QBnOOoLaAfKPirc.png",
    title = "YOURSELF HERE",
    subtitle = "Take a picture of yourself or upload it.",
    uid,
    previewUrl,
    actionLabel = "Generate",
    loaderSrc = "/assets/image-loader-light.gif",
    onResetAll
}) => {
    const screens = useBreakpoint();
    const isMobile = !screens.sm;
    const [api, contextHolder] = notification.useNotification();
    const [isGenerating, setIsGenerating] = useState(false);
    const [modelUrl, setModelUrl] = useState<string | null>(null);
    const [modelAsset, setModelAsset] = useState<UploadAsset | null>(null);


    const handleReset = React.useCallback(() => {
        // clear local state
        setModelUrl(null);
        setIsGenerating(false);
        setModelAsset(null);
        // now tell the parent to go back to upload view
        onResetAll?.();
    }, [onResetAll]);

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
                onReset={handleReset}
                contextHolder={contextHolder}
                isMobile={isMobile}
            />);
    }


    return (


        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16, maxHeight: "80vh" }}>

            {/* BUTTONS + GENERATE CARD */}
            <div style={{
                display: "flex",
                alignItems: "center",       // vertical center
                justifyContent: "center",   // horizontal center
                gap: 12,
                maxWidth: "50%",
                margin: "0 auto",           // optional: centers the div itself inside its parent
            }}>
                <Button
                    icon={!isGenerating ? <SendOutlined /> : undefined}
                    iconPosition="end"
                    onClick={handleGenerationSubmit}
                    loading={isGenerating}
                    disabled={isGenerating || !uid || !previewUrl}
                    block
                    size="large"
                    style={{
                        borderRadius: 12,   // ✅ rounder corners
                        fontSize: 12,       // ✅ smaller text (try 13 or 12 for even smaller)
                        //height: 42,         // optional: adjust height to match proportions
                    }}
                //style={{ marginTop: 16 }}
                >
                    {isGenerating ? "Generating ..." : actionLabel}
                </Button>

                <Button
                    icon={<ReloadOutlined />}
                    onClick={handleReset}
                    block
                    disabled={isGenerating}
                    size="large"
                    style={{
                        borderRadius: 12,   // ✅ rounder corners
                        fontSize: 12,       // ✅ smaller text (try 13 or 12 for even smaller)
                        //height: 42,         // optional: adjust height to match proportions
                    }}
                >
                    Choose another
                </Button>
            </div>

            {/* IMAGE AREA */}
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    //borderRadius: 8,
                    padding: 20,
                    border: "1px solid var(--ant-color-border)",
                    background: "var(--ant-color-bg-container)",
                    maxWidth: "100%",
                }}
            >

                {isGenerating ? (
                    <img
                        src="/assets/image-loader-light.gif"
                        alt="Generating ..."
                        style={{
                            width: "50%",
                            border: "1px solid var(--ant-color-border)",
                            borderRadius: 22,
                            objectFit: "contain",
                            verticalAlign: "middle"
                        }} //height: 24, width: 24
                    />
                ) : (
                    <img
                        src={displayedSrc}
                        alt="Preview"
                        style={{ width: "100%", height: "100%", maxHeight: "calc(100svh - 100px)", objectFit: "contain", borderRadius: 22 }}
                        draggable={false}
                    />
                )}

            </div>
        </div>



    );
};

export default GenerateModelCard;

