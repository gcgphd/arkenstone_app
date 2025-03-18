
import { useState } from 'react'
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

import { Layout, ConfigProvider, theme } from 'antd';
import type { ThemeConfig } from 'antd';

const { Content, Sider } = Layout;

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

  return (
    <ConfigProvider theme={config}>
      <Router>
        <Layout style={{ minHeight: '100vh', padding: 0, margin: 0 }}>
          <Sider style={{
            overflow: "auto",
            height: "100vh",
            position: "sticky",
            top: 0,
            left: 0
          }}
          >
            <CustomMenu />
          </Sider>
          <Layout>
            <Content style={{ margin: 0 }}>
              <Routes>
                <Route
                  path="/"
                  element={<Home />}
                />
                <Route
                  path="/login"
                  element={<Login />}
                />
              </Routes>

            </Content>
          </Layout>
        </Layout>
      </Router>
    </ConfigProvider>
  )
}

export default App
