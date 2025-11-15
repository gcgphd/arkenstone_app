import React from "react";
import { Spin, Empty } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import GalleryModal from "../components/GalleryModal";
import { useJobs } from "../context/JobsContext";

interface UserGalleryModalProps {
    userId?: string;   // kept for now but ignored – context uses logged-in user
    autoPoll?: boolean; // same here, polling handled elsewhere
}

const UserGalleryModal: React.FC<UserGalleryModalProps> = () => {
    const { thumbnails, loading, error } = useJobs();

    if (loading) {
        return (
            <div
                style={{
                    width: "100%",
                    height: "60vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Spin
                    tip="Loading Gallery"
                    indicator={<LoadingOutlined spin />}
                />
            </div>
        );
    }

    if (error) {
        return (
            <div
                style={{
                    width: "100%",
                    height: "60vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Empty description={error || "Error loading jobs"} />
            </div>
        );
    }

    if (!thumbnails.length) {
        return (
            <div
                style={{
                    width: "100%",
                    height: "60vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Empty description="No jobs yet" />
            </div>
        );
    }

    // ✅ Use thumbnails from JobsContext
    return <GalleryModal thumbnails={thumbnails} gallery={true} />;
};

export default UserGalleryModal;
