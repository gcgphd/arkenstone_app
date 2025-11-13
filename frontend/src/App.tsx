import CustomMenu from './components/CustonMenu';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from './pages/Login';
import Home from './pages/Home';
import UserGalleryModal from './pages/UserGallery';
import './App.css';
import { Layout, ConfigProvider, Grid, theme } from 'antd';
import type { ThemeConfig } from 'antd';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

const { Content, Sider, Header } = Layout;
const { useBreakpoint } = Grid;

const config: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#F9442E',
    colorLink: '#F9442E',
    fontFamily: "'DM Sans', sans-serif",
  },
  components: {
    Layout: { siderBg: '#131313', colorPrimary: "#F9442E" }
  }
};

function App() {
  const screens = useBreakpoint();
  const isMobile = !screens.md; // true under md breakpoint

  return (
    <AuthProvider>
      <ConfigProvider theme={config}>
        <NotificationProvider>
          <Router>
            <Layout
              style={{
                height: "100dvh",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "visible",
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
                      <Route path="/gallery" element={<UserGalleryModal />} />
                    </Routes>
                  </div>
                </Content>
              </Layout>
            </Layout>
          </Router>
        </NotificationProvider>
      </ConfigProvider>
    </AuthProvider >
  );
}

export default App;
