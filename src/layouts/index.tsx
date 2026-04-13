import {
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BookOutlined,
  CommentOutlined,
  DashboardOutlined,
  GiftOutlined,
  GoldOutlined,
  NotificationOutlined,
  SafetyOutlined,
  TeamOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { history, Outlet, useAccess, useIntl, useLocation, useModel } from '@umijs/max';
import { Layout, Menu, Spin, Typography } from 'antd';
import { useEffect, useMemo } from 'react';
import { appRouteManifest } from '../../config/routeManifest';
import HeaderActions from '@/components/HeaderActions';
import type { AppInitialState } from '@/types/runtime';
import { LOGIN_PATH } from '@/utils/auth';

const { Header, Sider, Content } = Layout;

const publicPaths = new Set([LOGIN_PATH, '/403', '/404']);

const menuIconMap: Record<string, JSX.Element> = {
  dashboard: <DashboardOutlined />,
  predict: <ThunderboltOutlined />,
  battle: <NotificationOutlined />,
  community: <TeamOutlined />,
  comments: <CommentOutlined />,
  nodes: <AppstoreOutlined />,
  pets: <GoldOutlined />,
  petFeatures: <ApiOutlined />,
  petGacha: <GiftOutlined />,
  risk: <SafetyOutlined />,
  audit: <AuditOutlined />,
  rules: <BookOutlined />,
};

export default function AppLayout() {
  const intl = useIntl();
  const location = useLocation();
  const access = useAccess() as Record<string, unknown>;
  const { initialState, loading } = useModel('@@initialState');
  const appState = initialState as AppInitialState | undefined;
  const isPublicPage = publicPaths.has(location.pathname);
  const redirectPath = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (!loading && !isPublicPage && !appState?.currentUser) {
      history.replace(`${LOGIN_PATH}?redirect=${encodeURIComponent(redirectPath)}`);
    }
  }, [appState?.currentUser, isPublicPage, loading, redirectPath]);

  const menuItems = useMemo(
    () =>
      appRouteManifest
        .filter(
          (item) =>
            item.name &&
            item.path &&
            !item.hideInMenu &&
            !publicPaths.has(item.path) &&
            (!item.access || access[item.access] === true),
        )
        .map((item) => ({
          key: item.path,
          icon: menuIconMap[item.name as keyof typeof menuIconMap],
          label: intl.formatMessage({
            id: `menu.${item.name}`,
            defaultMessage: item.name,
          }),
        })),
    [access, intl],
  );

  const selectedKeys = useMemo(() => {
    if (location.pathname === '/dashboard') {
      return ['/'];
    }

    return [location.pathname];
  }, [location.pathname]);

  if (loading && !isPublicPage) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f7fb',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (isPublicPage) {
    return <Outlet />;
  }

  if (!appState?.currentUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f7fb',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout className="turtle-app-shell" style={{ minHeight: '100vh', background: '#f5f7fb' }}>
      <Sider
        className="turtle-app-sider"
        width={248}
        theme="light"
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #eaecf0',
          background: '#fff',
        }}
      >
        <div className="turtle-app-sider-inner">
          <div style={{ padding: '24px 20px 16px' }}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Turtle Admin
            </Typography.Title>
            <Typography.Paragraph
              style={{ margin: '6px 0 0', color: '#667085', fontSize: 12 }}
            >
              企业后台运营中枢
            </Typography.Paragraph>
          </div>

          <div className="turtle-app-menu-scroll">
            <Menu
              mode="inline"
              selectedKeys={selectedKeys}
              items={menuItems}
              style={{ borderInlineEnd: 'none', paddingInline: 8 }}
              onClick={({ key }) => {
                history.push(String(key));
              }}
            />
          </div>
        </div>
      </Sider>

      <Layout className="turtle-app-main">
        <Header
          className="turtle-app-header"
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid #eaecf0',
            paddingInline: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <HeaderActions />
        </Header>

        <Content className="turtle-app-content" style={{ minWidth: 0 }}>
          <div className="turtle-app-content-scroll">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
