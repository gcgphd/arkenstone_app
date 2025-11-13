import React from "react";
import { Tooltip, Button } from "antd";
import type { ButtonProps } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

export type ActionItem = {
    key: string;
    label?: React.ReactNode;           // text before the icon
    icon?: React.ReactNode;
    loading?: boolean;                 // show spinner instead of icon
    onClick?: () => void;
    title?: React.ReactNode;
    disabled?: boolean;
    hidden?: boolean;
    fontSize?: number;                 // per-button font size
    style?: React.CSSProperties;       // per-button inline style
    buttonProps?: ButtonProps;         // pass through AntD props
};

type Direction = "horizontal" | "vertical";

export interface ActionButtonGroupProps {
    actions: ActionItem[];
    direction?: Direction;
    gap?: number;
    joined?: boolean;
    tooltipColor?: string;
    size?: ButtonProps["size"];
    type?: ButtonProps["type"];
    fontSize?: number;                 // global font size
    buttonStyle?: React.CSSProperties; // global button style
    onAction?: (key: string) => void;
    style?: React.CSSProperties;       // wrapper style
}

const ActionButtonGroup: React.FC<ActionButtonGroupProps> = ({
    actions,
    direction = "horizontal",
    gap = 8,
    joined = false,
    tooltipColor = "#333",
    size = "middle",
    type = "default",
    fontSize = 13,
    buttonStyle = {},
    onAction,
    style,
}) => {
    const visible = actions.filter((a) => !a.hidden);

    return (
        <div
            style={{
                display: "inline-flex",
                flexDirection: direction === "horizontal" ? "row" : "column",
                gap: joined ? 0 : gap,
                background: joined ? "var(--ant-color-bg-container)" : "transparent",
                padding: joined ? 4 : 0,
                borderRadius: joined ? 8 : 0,
                overflow: joined ? "hidden" : undefined,
                ...style,
            }}
        >
            {visible.map((a, i) => {
                const isFirst = i === 0;
                const isLast = i === visible.length - 1;

                const radius =
                    direction === "horizontal"
                        ? {
                            borderTopLeftRadius: isFirst ? 8 : 0,
                            borderBottomLeftRadius: isFirst ? 8 : 0,
                            borderTopRightRadius: isLast ? 8 : 0,
                            borderBottomRightRadius: isLast ? 8 : 0,
                        }
                        : {
                            borderTopLeftRadius: isFirst ? 8 : 0,
                            borderTopRightRadius: isFirst ? 8 : 0,
                            borderBottomLeftRadius: isLast ? 8 : 0,
                            borderBottomRightRadius: isLast ? 8 : 0,
                        };

                const content = (
                    <span
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: a.fontSize || fontSize,
                        }}
                    >
                        {a.label && <span>{a.label}</span>}
                        {a.loading ? (
                            <LoadingOutlined spin style={{ fontSize: a.fontSize || fontSize }} />
                        ) : (
                            a.icon
                        )}
                    </span>
                );

                const btn = (
                    <Button
                        key={a.key}
                        type={type}
                        size={size}
                        disabled={a.disabled || a.loading}
                        onClick={() => {
                            a.onClick?.();
                            onAction?.(a.key);
                        }}
                        style={{
                            ...(joined
                                ? { border: "none", ...radius }
                                : {
                                    borderRadius: 10,
                                    border: "1px solid var(--ant-color-border)",
                                    background: "var(--ant-color-bg-container)",
                                }),
                            padding: "6px 12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            ...buttonStyle,
                            ...a.style, // per-button override
                        }}
                        {...a.buttonProps}
                    >
                        {content}
                    </Button>
                );

                return a.title ? (
                    <Tooltip key={a.key} title={a.title} color={tooltipColor} placement="top">
                        {btn}
                    </Tooltip>
                ) : (
                    btn
                );
            })}
        </div>
    );
};

export default ActionButtonGroup;
