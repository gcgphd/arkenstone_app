// src/context/NotificationContext.tsx
import React, { createContext, useContext } from "react";
import { notification } from "antd";

type NotificationType = "success" | "info" | "warning" | "error";

interface NotificationContextValue {
    notify: (type: NotificationType, title: string, message: string) => void;
}

// 🔹 Global config – runs once when the module is imported
notification.config({
    placement: "topRight",  // top center
    top: 64,           // distance from the top (tweak if you have a header)
    duration: 3,          // optional: default duration

});

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [api, contextHolder] = notification.useNotification();

    const notify = (type: NotificationType, title: string, message: string) => {
        api[type]({
            message: title,
            description: message,
            placement: "topRight",           // ⬅️ enforce placement per-notification too
            //className: "app-notification-dark", // ⬅️ used for dark styling
        });
    };

    return (
        <NotificationContext.Provider value={{ notify }}>
            {contextHolder}
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotify = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error("useNotify must be used inside <NotificationProvider>");
    return ctx.notify;
};
