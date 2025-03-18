import { Row, Col } from "antd";
import React from "react";

interface ContentCenterProps {
    children: React.ReactNode;
}

const ContentCenter: React.FC<ContentCenterProps> = ({ children }) => {
    return (
        <Row gutter={[16, 16]} style={{ height: "100vh", width: "100%", display: "flex", alignContent: "center" }}>
            <Col
                lg={{ span: 10, offset: 7 }} md={{ span: 6, offset: 9 }} sm={{ span: 8, offset: 8 }} xs={{ span: 14, offset: 5 }}>
                {children}
            </Col>
        </Row>
    );
};

export default ContentCenter;