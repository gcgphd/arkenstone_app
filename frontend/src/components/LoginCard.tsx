import React from 'react';
import { useNavigate } from "react-router-dom";
import { Card, Input, Form, Button, Checkbox, Flex, notification } from 'antd';
import { login } from "../services/authService";

type NotificationType = 'success' | 'info' | 'warning' | 'error';


const LoginCard: React.FC = () => {

    const [api, contextHolder] = notification.useNotification();
    const navigate = useNavigate();

    const openNotificationWithIcon = (type: NotificationType, title: string, message: string) => {
        api[type]({
            message: title,
            description: message
        });
    };

    const onFinish = async (values: any) => {
        //setLoading(true);
        try {
            const data = await login(values.email, values.password);
            openNotificationWithIcon('success', 'Login successful!', '');
            //setIsLoggedIn(true);
            navigate("/");
        } catch (error: any) {
            openNotificationWithIcon('error', 'Login error', error.message);
            console.error("Login error:", error);
        } finally {
            //setLoading(false);
        }
    };

    return (

        <Card>
            {contextHolder}
            <Form
                name="login"
                layout="vertical"
                initialValues={{ remember: true }}
                requiredMark={false}
                //style={{ maxWidth: 360 }}
                onFinish={onFinish}
            >
                <Form.Item
                    name="email"
                    label="E-mail"
                    rules={[
                        {
                            type: 'email',
                            message: 'The input is not valid E-mail!',
                        },
                        {
                            required: true,
                            message: 'Please input your E-mail!',
                        },
                    ]}
                >
                    <Input placeholder="thorin@arkenstone.com" />
                </Form.Item>
                <Form.Item
                    name="password"
                    label="Password"
                    rules={[
                        {
                            required: true,
                            message: 'Please input your password!',
                        },
                    ]}
                >
                    <Input.Password />
                </Form.Item>
                <Form.Item>
                    <Flex justify="space-between" align="center">
                        <Form.Item name="remember" valuePropName="checked" noStyle>
                            <Checkbox>Remember me</Checkbox>
                        </Form.Item>
                        <a href="">Forgot password</a>
                    </Flex>
                </Form.Item>

                <Form.Item>
                    <Button block type="primary" htmlType="submit">
                        Log in
                    </Button>
                    or <a href="">Register now!</a>
                </Form.Item>
            </Form>
        </Card>

    );
}

export default LoginCard;
