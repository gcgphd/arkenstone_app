import React from "react";
import { Tooltip, Button } from "antd";
import { DownloadOutlined, DeleteOutlined, ShareAltOutlined } from "@ant-design/icons";


interface ActionButtonGroupProps {
    onDownload?: () => void;
    onDelete?: () => void;
    onShare?: () => void;
}

const ActionButtonGroup: React.FC<ActionButtonGroupProps> = ({
    onDownload,
    onDelete,
    onShare,
}) => {
    const buttons = [
        { key: "download", icon: <DownloadOutlined style={{ fontSize: "14px" }} />, title: "Download", onClick: onDownload },
        { key: "delete", icon: <DeleteOutlined style={{ fontSize: "14px" }} />, title: "Delete", onClick: onDelete },
        { key: "share", icon: <ShareAltOutlined style={{ fontSize: "14px" }} />, title: "Share", onClick: onShare },
    ];

    return (
        <div
            style={{
                display: "inline-flex",
                borderRadius: 6,
                overflow: "hidden",
                background: "var(--ant-color-bg-container)", // 👈 same gray tone as your card
                border: "none",        // 👈 no visible border
                padding: 4
            }}
        >
            {buttons.map((btn, i) => (
                <Tooltip key={btn.key} title={btn.title} color="#333" placement="top">
                    <Button
                        type="text"
                        onClick={btn.onClick}
                        style={{
                            cursor: "pointer",
                            padding: "6px 10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "background 0.2s",
                            //borderRight: i < buttons.length - 1 ? "1px solid #d9d9d9" : "none",
                            borderRadius: "6px"
                        }}
                    >
                        {btn.icon}
                    </Button>
                </Tooltip>
            ))}
        </div>
    );
};

export default ActionButtonGroup;
