import CustomMenu from './components/CustonMenu';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from './pages/Login';
import Home from './pages/Home';
import './App.css';
import { Layout, ConfigProvider, Grid, theme } from 'antd';
import type { ThemeConfig } from 'antd';

const { Content, Sider, Header } = Layout;
const { useBreakpoint } = Grid;

const config: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#F9442E',
    colorLink: '#F9442E',
    fontFamily: "'Bricolage Grotesque', sans-serif",
  },
  components: {
    Layout: { siderBg: '#131313', colorPrimary: "#F9442E" }
  }
};

function App() {
  const screens = useBreakpoint();
  const isMobile = !screens.md; // true under md breakpoint

  return (
    <ConfigProvider theme={config}>
      <Router>
        <Layout
          style={{
            height: "100dvh",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* ✅ Header only on mobile */}
          {isMobile && (
            <Header
              style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                width: "100%",
                display: "flex",
                alignItems: "center",
                background: "#131313",
              }}
            />
          )}

          <Layout
            style={{
              flex: 1,
              minHeight: 0,
              flexDirection: "row",
            }}
          >
            {/* ✅ Sider always visible on desktop, hidden on mobile (no scrollbars) */}
            {!isMobile && (
              <Sider
                width={260}
                style={{
                  height: "100%",
                  minHeight: 0,
                  overflow: "hidden", // ✅ no scrollbar
                  top: 0,
                  left: 0,
                }}
              >
                <CustomMenu />
              </Sider>
            )}

            <Content
              style={{
                margin: 0,
                height: "100%",
                minHeight: 0,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: 0,
                overflow: "auto", // ✅ only content scrolls if needed
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  minHeight: 0,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                </Routes>
              </div>
            </Content>
          </Layout>
        </Layout>
      </Router>
    </ConfigProvider>
  );
}

export default App;
