import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notification } from 'antd';
import { token } from "../services/protectService";
import ContentCenter from "../components/ContentCenter";
import UploadImageCard from '../components/UploadImageCard';

type NotificationType = 'success' | 'info' | 'warning' | 'error';

const MyProtectedComponent: React.FC = () => {

    const [api, contextHolder] = notification.useNotification();
    const [loading, setLoading] = useState(true);
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
                localStorage.setItem("uid", data.uid);
                //openNotificationWithIcon('success', 'Login successful!', '');
                //setIsLoggedIn(true);
                console.log("Login Success");
                setLoading(false);
            } catch (error: any) {
                openNotificationWithIcon('error', 'Login error', error.message);
                console.error("Login error:", error);
                navigate("/login?a=b");
            }

        }
        fetchData();
    }, [navigate]);


    if (loading) return <div>Loading...</div>;

    return (
        <ContentCenter direction='vertical'>
            {contextHolder}
            <UploadImageCard></UploadImageCard>
        </ContentCenter>
    );
};

export default MyProtectedComponent;