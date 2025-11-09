import React, { useState } from 'react';
import { Card, Typography, notification, Button } from 'antd';
import { SendOutlined } from "@ant-design/icons";
import { Flex, Grid } from "antd";
import ContentCenter from './ContentCenter';
import CustomUpload from './CustomUpload';
import GenerateModelCard from './GenerateModelCard';
import { BACKEND_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { UploadAsset } from '../types/types';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const PLACEHOLDER_SRC = "https://os.alipayobjects.com/rmsportal/QBnOOoLaAfKPirc.png"

type NotificationType = 'success' | 'info' | 'warning' | 'error';

const UploadImageCard: React.FC = () => {
    const authCtx = useAuth();
    const uid = authCtx?.auth?.uid;

    const [api, contextHolder] = notification.useNotification();
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [modelUrl, setModelUrl] = useState<string | null>(null);
    const [serverAsset, setServerAsset] = useState<UploadAsset | null>(null);

    // ✅ rename to setDoneUploading to match state
    const [doneUploading, setDoneUploading] = React.useState(false);

    const screens = useBreakpoint();
    const isMobile = !screens.sm;

    const CARD_W = isMobile ? "min(92vw, 420px)" : 420;
    const CARD_H = isMobile ? "auto" : "60vh";
    const CARD_PAD = isMobile ? 16 : 40;

    const openNotificationWithIcon = (type: NotificationType, title: string, message: string) => {
        api[type]({ message: title, description: message });
    };

    const handleSuccess = (resp: any) => {
        setServerAsset(resp as UploadAsset);

        let url = previewUrl;
        if (resp?.url) {
            url = resp.url.startsWith("http") ? resp.url : `${BACKEND_URL}${resp.url}`;
        }
        if (url) {
            setPreviewUrl(url);
            setDoneUploading(true); // ✅ show the SimpleCard after upload completes
        }

        openNotificationWithIcon("success", "Upload complete", "");
    };

    const handleError = (err: any) => {
        openNotificationWithIcon("error", "Upload failed", String(err ?? ""));
    };

    const handleLocalPreview = (url: string) => {
        setPreviewUrl(url);
    };

    const beforeUpload = (file: File) => {
        const isLt20M = file.size / 1024 / 1024 < 20;
        if (!isLt20M) openNotificationWithIcon("error", "Max 20MB file size is allowed", '');
        return isLt20M;
    };

    // ✅ When doneUploading is true, show the SimpleCard and hide the upload card
    if (doneUploading) {
        return (
            <GenerateModelCard
                uid={uid}
                // Show the uploaded image first, then loader, then result (SimpleCard handles this)
                previewUrl={previewUrl ?? undefined}
                title="YOURSELF HERE"
                subtitle="Take a picture of yourself or upload it."
                actionLabel="Generate"
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
                padding: CARD_PAD,
            }}
            styles={{
                body: {
                    flex: 1,
                    display: "flex",
                    overflow: isMobile ? "auto" : "hidden",
                    padding: 16,
                    minHeight: 0,
                },
            }}
        >
            {contextHolder}

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
                                objectFit: "contain",
                                userSelect: "none",
                                borderRadius: 22
                            }}
                        />
                    </div>

                    <div>
                        <Title level={2}>YOURSELF HERE</Title>
                        <Text type="secondary"> Take a picture of yourself or upload it.</Text>
                    </div>
                </Flex>

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
                />
            </ContentCenter>
        </Card>
    );
};

export default UploadImageCard;

