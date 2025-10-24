import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notification } from 'antd';
import { token } from "../services/protectService";
import { Upload, Button, message } from "antd";
import type { UploadProps } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import ContentCenter from "../components/ContentCenter";

type NotificationType = 'success' | 'info' | 'warning' | 'error';

const MyProtectedComponent: React.FC = () => {

    const [api, contextHolder] = notification.useNotification();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const navigate = useNavigate();

    const openNotificationWithIcon = (type: NotificationType, title: string, message: string) => {
        api[type]({
            message: title,
            description: message
        });
    };

    useEffect(() => {
        //setLoading(true);
        const fetchData = async () => {
            try {
                const data = await token();
                //openNotificationWithIcon('success', 'Login successful!', '');
                //setIsLoggedIn(true);
                console.log(data);
                setLoading(false);
            } catch (error: any) {
                openNotificationWithIcon('error', 'Login error', error.message);
                console.error("Login error:", error);
                navigate("/login?a=b");
            }

        }
        fetchData();
    }, [navigate]);

    const props: UploadProps = {
        name: "file",
        action: "http://localhost:8080/upload_image_to_dir",
        listType: "picture", // shows thumbnail previews for images
        onChange(info) {
            const { status, response } = info.file;
            if (status === "done") {
                message.success("Upload complete");
                // tell AntD where the preview is
                if (response?.url) {
                    info.file.url = `http://localhost:8080${response.url}`;
                    console.log(info.file)
                }
            } else if (status === "error") {
                message.error("Upload failed");
            }
        },
        // optional client guard
        beforeUpload(file) {
            const isLt20M = file.size / 1024 / 1024 < 20;
            if (!isLt20M) message.error("Max 20MB");
            return isLt20M;
        }
    };


    if (loading) return <div>Loading...</div>;

    return (
        <ContentCenter>
            <Upload {...props}>
                <Button icon={<UploadOutlined />}>Click to Upload</Button>
            </Upload>
        </ContentCenter>
    );
};

export default MyProtectedComponent;