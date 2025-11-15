import React, { useState } from 'react';
import { Card, Typography } from 'antd';
import { SendOutlined, UploadOutlined, FolderAddOutlined } from "@ant-design/icons";
import { Flex, Grid } from "antd";
import ContentCenter from './ContentCenter';
import CustomUpload from './CustomUpload';
import PreviewPanel from './PreviewPanel';
import GenerateModelCard from './GenerateModelCard';
import ModelModalGallery from './ModelModalGallery';
import { BACKEND_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { useNotify } from "../context/NotificationContext";
import { UploadAsset } from '../types/types';
import { useModels } from "../context/ModelsContext";


const { Title, Text } = Typography;
const { useBreakpoint } = Grid;



const PLACEHOLDER_SRC = "/assets/photo_guide.png"//"https://os.alipayobjects.com/rmsportal/QBnOOoLaAfKPirc.png"


const UploadImageCard: React.FC = () => {
    const authCtx = useAuth();
    const uid = authCtx?.auth?.uid;
    const notify = useNotify();

    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [modelUrl, setModelUrl] = React.useState<string | null>(null);
    const [modelAsset, setModelAsset] = useState<UploadAsset | null>(null);
    const [doneUploading, setDoneUploading] = React.useState(false);
    const [modelOpen, setModelOpen] = React.useState(false);


    const { models, loading: loadingModels, error: modelsError } = useModels();

    const screens = useBreakpoint();
    const isMobile = !screens.sm;

    const CARD_W = isMobile ? "min(92vw, 420px)" : 420;
    const CARD_H = isMobile ? "80vh" : "80vh"; //
    const CARD_PAD = isMobile ? 20 : 20;


    // This will reset all from the Preview Panel
    // In Generate Model Card.
    const handleTopReset = React.useCallback(() => {
        setDoneUploading(false);
        setPreviewUrl(null);
        setModelAsset(null);
        setModelUrl(null);
        // (modelUrl is in GenerateModelCard, so it will clear itself)
    }, []);

    const handleSelectModel = (asset: UploadAsset) => {
        setModelAsset(asset);

        // best URL (from your service pattern)
        setModelUrl(
            asset.url ||
            asset.thumbUrl ||
            null
        );
    };


    const handleSuccess = (resp: any) => {
        setModelAsset(resp as UploadAsset);

        let url = previewUrl;
        if (resp?.url) {
            url = resp.url.startsWith("http") ? resp.url : `${BACKEND_URL}${resp.url}`;
        }
        if (url) {
            setPreviewUrl(url);
            setDoneUploading(true); // ✅ show the SimpleCard after upload completes
        }

        notify("success", "Upload complete", "");
    };

    const handleError = (err: any) => {
        notify("error", "Upload failed", String(err ?? ""));
    };

    const handleLocalPreview = (url: string) => {
        setPreviewUrl(url);
    };

    const beforeUpload = (file: File) => {
        const isLt20M = file.size / 1024 / 1024 < 20;
        if (!isLt20M) notify("error", "Max 20MB file size is allowed", '');
        return isLt20M;
    };


    if (modelUrl) {
        return (
            <PreviewPanel
                previewUrl={modelUrl}
                initialAsset={modelAsset ?? undefined}
                onReset={handleTopReset}
                isMobile={isMobile}
            />);
    }

    // ✅ When doneUploading is true, show the SimpleCard and hide the upload card
    if (doneUploading) {
        return (
            <GenerateModelCard
                uid={uid}
                // Show the uploaded image first, then loader, then result (SimpleCard handles this)
                previewUrl={previewUrl ?? undefined}
                imageAsset={modelAsset ?? undefined}
                title="YOURSELF HERE"
                subtitle="Take a picture of yourself or upload it."
                actionLabel="Generate"
                onResetAll={handleTopReset}
            />
        );
    }

    // Default: show the upload card with CustomUpload
    return (

        <Card
            hoverable
            style={{
                width: CARD_W,
                maxWidth: 420,
                minWidth: 0,
                height: CARD_H,
                flex: isMobile ? "0 1 auto" : "0 0 420px",
                display: "flex",
                flexDirection: "column",
                borderRadius: 20,
                padding: 0,
                backgroundColor: "transparent", // transparent background
                border: "2px dashed rgba(255, 255, 255, 0.3)", // dashed border with light opacity
            }}
            styles={{
                body: {
                    flex: 1,
                    display: "flex",
                    overflow: isMobile ? "auto" : "hidden",
                    padding: CARD_PAD,
                    minHeight: 0,
                },
            }}
        >



            <ContentCenter direction='vertical' style={{ minHeight: 0 }} gap={50}>
                <Flex vertical align="center" gap={8} style={{ width: "100%", flex: 1, minHeight: 0 }}>
                    <div
                        style={{
                            flex: 1,
                            minHeight: 0,
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                        }}
                    >
                        <img
                            draggable={false}
                            alt="example"
                            src={previewUrl ? previewUrl : PLACEHOLDER_SRC}
                            style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                userSelect: "none",
                                borderRadius: 22,
                                border: "px solid white",
                                boxSizing: "border-box",
                            }}
                        />
                    </div>

                    <div style={{ width: "100%", textAlign: "center" }}>
                        <Title level={3}>YOURSELF HERE</Title>
                        <Text type="secondary">Take a picture of yourself or upload it.</Text>
                    </div>

                    <CustomUpload
                        action={`${BACKEND_URL}/upload_image_to_gcs_signed_tmp`}
                        uid={uid ?? undefined}
                        name="file"
                        accept="image/*"
                        maxSizeMB={20}
                        beforeUpload={beforeUpload}
                        onLocalPreview={handleLocalPreview}
                        onSuccess={handleSuccess}
                        onError={handleError}
                        buttonText="Upload Media"
                        block
                        withDrop
                        onOpenGallery={() => setModelOpen(true)}
                    />

                    <ModelModalGallery
                        open={modelOpen}
                        onClose={() => setModelOpen(false)}
                        items={models}
                        loading={loadingModels}
                        error={modelsError || undefined}
                        onSelectModel={handleSelectModel}
                    />



                    {/* <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 2,
                            maxWidth: "100%",
                            width: "100%",
                            margin: "0 auto",
                            padding: "6px 6px",
                            background: "#161616ff",
                            borderRadius: 16,
                            border: "1px solid var(--ant-color-border)",
                            boxShadow: "0 0 8px rgba(0,0,0,0.15)",
                        }}
                    >

                        <Button
                            icon={<UploadOutlined />}
                            onClick={handleError}
                            size="large"
                            color="default"
                            variant="text"
                            block
                            style={{
                                borderRadius: 14,
                                fontSize: 12,
                            }}
                        >
                            Upload Media
                        </Button>

                        <Button
                            icon={<FolderAddOutlined />}
                            onClick={handleError}
                            size="large"
                            color="default"
                            variant="text"
                            block
                            style={{
                                borderRadius: 14,
                                fontSize: 12,
                            }}
                        >
                            Choose From Gallery
                        </Button>

                    </div> */}

                </Flex>


            </ContentCenter>
        </Card>
    );
};

export default UploadImageCard;

