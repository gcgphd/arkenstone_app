
import CustomMenu from './components/CustonMenu';

import {
  BrowserRouter as Router,
  Routes,
  Route,
  // useNavigate,
} from "react-router-dom";
import Login from './pages/Login';
import Home from './pages/Home';

import './App.css'

import { Layout, ConfigProvider, Grid, theme } from 'antd';
import type { ThemeConfig } from 'antd';

const { Content, Sider, Header } = Layout;
const { useBreakpoint } = Grid;

//const { useToken } = theme;
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
// By static function
//const globalToken = getDesignToken(config);

function App() {
  //const [collapsed, setCollapsed] = useState(false);
  //const { token } = useToken();
  const screens = useBreakpoint();

  // 👇 Hide menu on small screens (e.g. xs and sm)
  const isMobile = !screens.md;

  if (isMobile) {
    return (
      <ConfigProvider theme={config}>
        <Router>
          <Layout
            style={{
              height: "100dvh",                 // single source of truth for page height
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Header
              style={{
                position: "sticky",
                top: 0,
                zIndex: 10,
                width: "100%",
                display: "flex",
                alignItems: "center",
              }}
            />

            {/* Fill the rest of the screen below the header */}
            <Layout style={{ flex: 1, minHeight: 0 }}>
              <Content
                style={{
                  margin: 0,
                  padding: 0,
                  height: "100%",               // match parent
                  minHeight: 0,                 // allow shrinking on mobile
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  overflow: "auto",             // localize any scroll to content
                }}
              >
                {/* Center routes within the content area */}
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
    )
  }

  return (
    <ConfigProvider theme={config}>
      <Router>
        <Layout
          style={{
            height: "100dvh",   // single source of truth
            padding: 0,
            margin: 0,
            overflow: "hidden",
          }}
        >
          <Sider
            style={{
              height: "100%",   // fill remaining height
              minHeight: 0,     // allow shrinking
              overflow: "auto", // only sider scrolls if needed
              top: 0,
              left: 0,
            }}
          >
            <CustomMenu />
          </Sider>

          <Layout style={{ height: "100%", minHeight: 0 }}>
            <Content
              style={{
                margin: 0,
                height: "100%",     // match parent
                minHeight: 0,       // fix flex overflow on mobile
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: 0,
                overflow: "auto",   // localize any scroll to content
              }}
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
              </Routes>
            </Content>
          </Layout>
        </Layout>
      </Router>
    </ConfigProvider>
  )
}

export default App
