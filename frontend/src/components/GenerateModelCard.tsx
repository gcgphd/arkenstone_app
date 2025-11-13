import React, { useState } from "react";
import { Button, notification, Grid, Flex, Popover } from "antd";
import { SendOutlined, CheckOutlined, CloseOutlined, SaveOutlined } from "@ant-design/icons";
import { send_generation_job } from "../services/jobsService";
import { saveModel } from "../services/modelService";
import { UploadAsset } from '../types/types';
import { useNotify } from "../context/NotificationContext";
import PreviewPanel from "./PreviewPanel";
import ActionButtonGroup from "./ActionButtonGroup";
const { useBreakpoint } = Grid;


interface GenerateModelCardProps {
    imageSrc?: string;            // ultimate fallback
    imageAsset?: UploadAsset;
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
    imageAsset,
    title = "YOURSELF HERE",
    subtitle = "Take a picture of yourself or upload it.",
    uid,
    previewUrl,
    actionLabel = "Generate",
    loaderSrc = "/assets/image-loader-light.gif",
    onResetAll
}) => {

    const notify = useNotify();
    const screens = useBreakpoint();
    const isMobile = !screens.sm;
    const [api, contextHolder] = notification.useNotification();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [modelUrl, setModelUrl] = useState<string | null>(null);
    const [modelAsset, setModelAsset] = useState<UploadAsset | null>(null);



    const handleUseAsIs = () => {
        if (!previewUrl) {
            console.error("No preview url to use as model");
            return;
        }
        if (!imageAsset) {
            console.error("No information to use as model");
            return;
        }


        // do not call the backend, just lock in the current preview as the model
        setModelUrl(previewUrl);
        setModelAsset(imageAsset);
    };


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

    const handleSaveModel = async () => {
        if (!uid) {
            notify('error', 'authenticated', '')
            return;
        }

        // Prefer the modelAsset (after generation / use-as-is), fallback to imageAsset
        const assetToSave = modelAsset ?? imageAsset;

        if (!assetToSave) {
            api.error({ message: "No model selected to save" });
            return;
        }

        if (!assetToSave.gcs_path) {
            api.error({ message: "Model has no storage path (gcs_path missing)" });
            return;
        }

        setIsSaving(true);
        try {
            const res = await saveModel(uid, assetToSave);
            notify('success', 'Model saved successfully', '')
        } catch (err: any) {
            console.error(err);
            notify('success', 'Error while saving model', '')
        } finally {
            setIsSaving(false);
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
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    maxWidth: "60%",
                    margin: "0 auto",
                    padding: "6px 6px",
                    background: "#161616ff",
                    borderRadius: 16,
                    border: "1px solid var(--ant-color-border)",
                    boxShadow: "0 0 8px rgba(0,0,0,0.15)",
                }}
            >

                <Button
                    icon={<CheckOutlined />}
                    onClick={handleUseAsIs}
                    disabled={!previewUrl || isGenerating || isSaving}
                    block
                    size="large"
                    color="default"
                    variant="text"
                    style={{
                        borderRadius: 14,
                        fontSize: 12,
                    }}
                >
                    Use This Image
                </Button>

                <Button
                    icon={<CloseOutlined />}
                    onClick={handleReset}
                    block
                    disabled={isGenerating || isSaving}
                    size="large"
                    color="default"
                    variant="text"
                    style={{
                        borderRadius: 14,
                        fontSize: 12,
                    }}
                >
                    Choose Another
                </Button>

                <Button
                    icon={<SaveOutlined />}
                    onClick={handleSaveModel}
                    block
                    loading={isSaving}
                    disabled={isGenerating}
                    size="large"
                    color="default"
                    variant="text"
                    style={{
                        borderRadius: 14,
                        fontSize: 12,
                    }}
                >
                    Save as Model
                </Button>

            </div>


            {/* IMAGE AREA */}
            <div
                style={{
                    flex: "1 1 0",
                    minHeight: 0,                  // allow shrinking inside flex
                    maxHeight: "100%",             // never exceed the 80vh wrapper
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 20,
                    border: "1px solid var(--ant-color-border)",
                    background: "var(--ant-color-bg-container)",
                    maxWidth: "100%",
                    boxSizing: "border-box",       // padding doesn't push height beyond 100%
                }}
            >
                {/* Rounded clipping frame prevents any overflow */}
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: 22,
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    {isGenerating ? (
                        <img
                            src="/assets/image-loader-light.gif"
                            alt="Generating ..."
                            style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain",
                                display: "block",
                                borderRadius: 22
                            }}
                            draggable={false}
                        />
                    ) : (
                        <img
                            src={displayedSrc}
                            alt="Preview"
                            style={{
                                maxWidth: "100%",   // <= never overflow width
                                maxHeight: "100%",  // <= never overflow height
                                width: "auto",
                                height: "auto",
                                objectFit: "contain",
                                display: "block",
                                borderRadius: 22
                            }}
                            draggable={false}
                        />
                    )}
                </div>
            </div>
        </div>



    );
};

export default GenerateModelCard;

