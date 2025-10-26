import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Card, Typography, notification } from 'antd';
import { Button, Flex, Grid } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import ContentCenter from './ContentCenter';
import CustomUpload from './CustomUpload';
import PreviewPanel from "./PreviewPanel";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

type NotificationType = 'success' | 'info' | 'warning' | 'error';


const UploadImageCard: React.FC = () => {

    const [api, contextHolder] = notification.useNotification();
    const [previewUrl, setPreviewUrl] = useState<string | null>(null); // 👈 controls visibility
    const [serverUrl, setServerUrl] = useState<string | null>(null);   // final URL from backend

    const navigate = useNavigate();
    const screens = useBreakpoint();
    const isMobile = !screens.sm; // < sm

    const CARD_W = isMobile ? "min(92vw, 420px)" : 420; // shrink on phones
    const CARD_H = isMobile ? "auto" : "60vh";          // avoid tall overflow on phones
    const CARD_PAD = isMobile ? 16 : 40;

    const openNotificationWithIcon = (type: NotificationType, title: string, message: string) => {
        api[type]({
            message: title,
            description: message
        });
    };


    const handleSuccess = (resp: any, file: File) => {

        // If backend returns { url: "/uploads/xxx.png" }
        const url = resp?.url ? `http://localhost:8080${resp.url}` : previewUrl;
        setServerUrl(url || null);
        openNotificationWithIcon("success", "Upload complete", "");
        // At this point previewUrl is already set (local object URL).
        // If you prefer to switch to the server URL for preview:
        if (url) setPreviewUrl(url);
    };

    const handleError = (err: any) => {
        openNotificationWithIcon("error", "Upload failed", String(err ?? ""));
    };

    const handleLocalPreview = (url: string) => {
        setPreviewUrl(url); // show instantly
    };

    const reset = () => {
        setPreviewUrl(null);
        setServerUrl(null);
    };

    const beforeUpload = (file: File) => {
        // extra client validation if needed
        const isLt20M = file.size / 1024 / 1024 < 20;
        if (!isLt20M) openNotificationWithIcon("error", "Max 20MB file size is allowed", '');
        return isLt20M;
    };

    // If we have a preview, hide the upload card and show the image preview panel
    if (previewUrl) {
        return (
            <PreviewPanel
                previewUrl={previewUrl}
                onReset={reset}
                contextHolder={contextHolder}
                isMobile={isMobile}
            />
        );
    }

    return (


        <Card
            hoverable
            style={{
                width: CARD_W,
                maxWidth: 420,
                minWidth: 0,                   // allow shrinking in flex parents
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
                    overflow: isMobile ? "auto" : "hidden", // scroll if needed on phones
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
                            flex: 1,                           // image area grows
                            minHeight: 0,                      // allow child to shrink
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
                            src="https://os.alipayobjects.com/rmsportal/QBnOOoLaAfKPirc.png"
                            style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain",
                                userSelect: "none",
                            }}
                        />
                    </div>

                    <div>
                        <Title level={2}>YOURSELF HERE</Title>
                        <Text type="secondary"> Take a picture of yourself or upload it.</Text>
                    </div>
                </Flex>

                <CustomUpload
                    action="http://localhost:8080/upload_image_to_dir"
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
}

export default UploadImageCard;
