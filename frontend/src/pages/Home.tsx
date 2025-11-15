import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notification, Button } from 'antd';
import { token } from "../services/protectService";
import ContentCenter from "../components/ContentCenter";
import UploadImageCard from '../components/UploadImageCard';
import { useAuth } from "../context/AuthContext";
import GalleryModal from '../components/GalleryModal';
import UserGalleryModal from './UserGallery';
import { useJobs } from '../context/JobsContext';

type NotificationType = 'success' | 'info' | 'warning' | 'error';

const MyProtectedComponent: React.FC = () => {
    const { auth, setAuth } = useAuth();
    const [api, contextHolder] = notification.useNotification();
    const [loading, setLoading] = useState(true);
    const [gallery, setGallery] = useState(false);
    const navigate = useNavigate();
    const { thumbnails } = useJobs();

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
                // store in global auth (this also persists to localStorage via your context)

                const nextUid = data.uid ?? null;
                const nextEmail = data.email ?? null;

                //only update auth if something actually changed
                if (auth.uid !== nextUid || auth.email !== nextEmail) {
                    console.log("Updating Auth");
                    setAuth({ uid: nextUid, email: nextEmail });
                }
                console.log("Login Success");
                setLoading(false);
            } catch (error: any) {
                openNotificationWithIcon('error', 'Login error', error.message);
                console.error("Login error:", error);
                navigate("/login");
            }

        }
        fetchData();
    }, [navigate]);


    if (loading) return <div>Loading...</div>;

    //guard if uid is still missing
    if (!auth.uid) {
        navigate("/login");
        return null;
    }

    if (gallery) {
        return (
            <UserGalleryModal />
        )
    }


    return (
        <ContentCenter direction='vertical'>
            {contextHolder}
            <Button onClick={() => setGallery(true)}></Button>

            {gallery ? (
                <UserGalleryModal />
            ) : (
                <UploadImageCard />
            )}
        </ContentCenter>
    );
};

export default MyProtectedComponent;