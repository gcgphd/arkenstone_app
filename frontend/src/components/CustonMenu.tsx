import React from 'react';
import { useNavigate } from "react-router-dom";
import { UserOutlined, MailOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { Button, Flex, Popover } from 'antd';

import { logout } from "../services/authService";




const CustomMenu: React.FC = () => {

    const navigate = useNavigate()

    const onLogoutClick = async () => {
        //setLoading(true);
        try {
            const data = await logout();
            //openNotificationWithIcon('success', 'Logout successful!', '');
            //setIsLoggedIn(true);
            navigate("/login");
        } catch (error: any) {
            //openNotificationWithIcon('error', 'Login error', error.message);
            console.error("Login error:", error);
        } finally {
            //setLoading(false);
        }
    };

    const popoverContent = (
        <div>
            <Button type="link" size="small" onClick={onLogoutClick}>Logout</Button>
        </div>
    )


    return (
        <Flex gap="gap" justify="space-between" align="start" style={{ height: "100vh" }} vertical>
            <Flex vertical>
                <Button type="primary">Primary</Button>
            </Flex>
            <Flex gap="small" style={{ padding: "10px" }} vertical>
                <Popover
                    placement="rightBottom"
                    content={popoverContent}
                >
                    <Button icon={<UserOutlined />} size="small" />
                </Popover>
            </Flex>
        </Flex>
    );
};

export default CustomMenu;