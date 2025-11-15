import React from "react";
import { Modal, Grid, Spin, Empty, Button, Image, Tooltip } from "antd";
import { CheckOutlined, DeleteOutlined } from "@ant-design/icons";
import { UploadAsset } from "../types/types";
import { useNotify } from "../context/NotificationContext";
import { useModels } from "../context/ModelsContext";
import { deleteModel } from "../services/modelService";

const { useBreakpoint } = Grid;

interface ModelModalGalleryProps {
    open: boolean;
    onClose?: () => void;
    items: UploadAsset[];
    loading?: boolean;
    error?: string;
    onSelectModel?: (item: UploadAsset) => void;
}

const ModelModalGallery: React.FC<ModelModalGalleryProps> = ({
    open,
    onClose,
    items,
    loading,
    error,
    onSelectModel,
}) => {
    const screens = useBreakpoint();
    const notify = useNotify();
    const { refetch } = useModels();

    const modalWidth = React.useMemo(() => {
        if (screens.xxl) return "60%";
        if (screens.xl) return "50%";
        if (screens.lg) return "60%";
        if (screens.md) return "70%";
        if (screens.sm) return "80%";
        return "90%";
    }, [screens]);

    const handleSelect = (item: UploadAsset) => {
        onSelectModel?.(item);   // notify parent
        onClose?.();
    };


    const handleDeleteModel = async (asset: UploadAsset) => {

        if (!asset.gcs_path) {
            notify("error", "Missing model file path", "");
            return;
        }

        try {
            await deleteModel(asset.gcs_path);

            notify("success", "Model deleted successfully", "");

            // Refresh the list in ModelsContext
            await refetch();

        } catch (err: any) {
            notify("error", err?.message || "Error deleting model", "");
        }
    };

    return (

        <Modal
            className="models-modal"
            open={open}
            onCancel={onClose}
            width={modalWidth}
            footer={null}
            style={{ top: 16 }}
            styles={{
                mask: {
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                    backdropFilter: "blur(8px)",
                },
                content: {
                    height: "90vh",
                    display: "flex",
                    flexDirection: "column",
                    background: "rgba(255, 255, 255, 0)",
                    backdropFilter: "blur(18px)",
                    WebkitBackdropFilter: "blur(18px)",
                    border: "1px solid rgba(255, 255, 255, 0)",
                    boxShadow: "0 8px 40px rgba(0, 0, 0, 0)",
                    borderRadius: 12,
                    color: "white",
                },
                header: {
                    background: "transparent",
                    borderBottom: "none",
                    color: "white",
                },
                body: {
                    flex: 1,
                    overflowY: "auto",
                    padding: 12,
                    background: "transparent",
                    color: "white",
                },
                footer: {
                    background: "transparent",
                    borderTop: "none",
                },
            }}
        >
            {loading && (
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Spin size="large" />
                </div>
            )}

            {!loading && error && (
                <div
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "red",
                    }}
                >
                    {error}
                </div>
            )}

            {!loading && !error && items.length === 0 && (
                <Empty description="No models available" />
            )}

            {!loading && !error && items.length > 0 && (
                <div
                    className="hide-scrollbar"
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        justifyContent: "flex-start",
                    }}
                >
                    {items.map((item) => (

                        <div
                            key={item.gcs_path}
                            style={{
                                position: "relative",
                                flex: screens.sm
                                    ? "0 0 calc(25% - 12px)"   // 4 per row on bigger screens
                                    : "0 0 calc(50% - 12px)",  // 2 per row on small screens
                                maxWidth: screens.sm
                                    ? "calc(25% - 12px)"
                                    : "calc(50% - 12px)",
                                borderRadius: 10,
                                background: "#111",
                                padding: 0,
                                boxSizing: "border-box",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >

                            <div
                                //key={item.gcs_path}
                                style={{
                                    display: "flex",
                                    position: "absolute",
                                    bottom: 12,
                                    right: 12,
                                    zIndex: 10,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 0,
                                    //width: "100%",
                                    margin: "0 auto",
                                    padding: "4px 4px",
                                    background: "#161616ff",
                                    borderRadius: 12,
                                    border: "1px solid var(--ant-color-border)",
                                    boxShadow: "0 0 8px rgba(0,0,0,0.15)",
                                }}
                            >
                                <Tooltip placement="top" title={"Select"} arrow={true} color={"#161616ff"}>
                                    <Button
                                        icon={<CheckOutlined />}
                                        onClick={() => handleSelect(item)}
                                        iconPosition="end"
                                        size="small"
                                        color="default"
                                        variant="text"
                                        block
                                        style={{
                                            borderRadius: 8,
                                            fontSize: 12,
                                            padding: 10
                                        }}
                                    >
                                    </Button>
                                </Tooltip>

                                <Tooltip placement="top" title={"Delete"} arrow={true} color={"#161616ff"}>
                                    <Button
                                        icon={<DeleteOutlined />}
                                        onClick={() => handleDeleteModel(item)}
                                        iconPosition="end"
                                        size="small"
                                        color="default"
                                        variant="text"
                                        block
                                        style={{
                                            borderRadius: 8,
                                            fontSize: 12,
                                            padding: 10
                                        }}
                                    >
                                    </Button>
                                </Tooltip>
                            </div>



                            {/* Image – grows naturally in height, no cropping */}
                            < Image
                                src={item.url}
                                alt={item.filename}
                                draggable={false}
                                preview={false}
                                style={{
                                    width: "100%",
                                    height: "auto",
                                    objectFit: "contain",
                                    borderRadius: 6,
                                    userSelect: "none",
                                    display: "block",
                                }}
                            />
                        </div>
                    ))}
                </div>
            )
            }
        </Modal >
    );
};

export default ModelModalGallery;


