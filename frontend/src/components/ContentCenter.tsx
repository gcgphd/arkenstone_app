import { Row, Col, Flex } from "antd";
import React from "react";


interface ContentCenterProps {
    children: React.ReactNode;
    direction?: string;               // boolean is more idiomatic
    style?: React.CSSProperties;      // allow passing styles
    className?: string;
    gap?: number | string;
}

const ContentCenter: React.FC<ContentCenterProps> = ({
    children,
    direction = 'horizontal',
    style,
    className,
    gap = 16
}) => {

    if (direction === 'vertical') {
        return (
            <Flex
                vertical
                justify="center"
                align="center"
                className={className}
                style={{ height: "100%", width: "100%", minHeight: 0, ...style }} // minHeight:0 fixes flex overflow in columns
                gap={gap}
            >
                {children}
            </Flex>
        );
    }

    return (
        <Flex
            justify="center"
            align="center"
            className={className}
            style={{ height: "100%", width: "100%", minHeight: 0, ...style }} // minHeight:0 fixes flex overflow in columns
            gap={16}
        >
            {children}
        </Flex>
    );
};

export default ContentCenter;



