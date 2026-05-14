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
  PictureOutlined,
  SafetyOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, Outlet, useAccess, useIntl, useLocation, useModel } from '@umijs/max';
import { Breadcrumb, Layout, Menu, Spin, Typography, type MenuProps } from 'antd';
import { useEffect, useMemo } from 'react';
import { appRouteManifest, pageTitleMap, type AppRouteItem } from '../../config/routeManifest';
import HeaderActions from '@/components/HeaderActions';
import type { AppInitialState } from '@/types/runtime';
import { LOGIN_PATH } from '@/utils/auth';

const { Header, Sider, Content } = Layout;

const publicPaths = new Set([LOGIN_PATH, '/403', '/404']);

const menuIconMap: Record<string, JSX.Element> = {
  dashboard: <DashboardOutlined />,
  predict: <ThunderboltOutlined />,
  battle: <NotificationOutlined />,
  pk: <TrophyOutlined />,
  community: <TeamOutlined />,
  comments: <CommentOutlined />,
  nodes: <AppstoreOutlined />,
  pets: <GoldOutlined />,
  petFeatures: <ApiOutlined />,
  petGacha: <GiftOutlined />,
  petGachaPool: <GiftOutlined />,
  petGachaRatio: <ThunderboltOutlined />,
  petEggConfig: <GoldOutlined />,
  petAbilities: <ApiOutlined />,
  petList: <GoldOutlined />,
  petTypes: <PictureOutlined />,
  userManagement: <UserOutlined />,
  users: <TeamOutlined />,
  risk: <SafetyOutlined />,
  audit: <AuditOutlined />,
  rules: <BookOutlined />,
};

const petManagementMenuRoute: AppRouteItem = {
  path: '/pet-management',
  name: 'pets',
  routes: [
    {
      path: '/pets/types',
      name: 'petTypes',
      access: 'canPets',
    },
    {
      path: '/pet-features',
      name: 'petFeatures',
      access: 'canPetFeatures',
    },
    {
      path: '/pet-abilities',
      name: 'petAbilities',
      access: 'canPets',
    },
  ],
};

const petGachaMenuRoute: AppRouteItem = {
  path: '/pet-gacha-management',
  name: 'petGachaPool',
  routes: [
    {
      path: '/pets',
      name: 'petEggConfig',
      access: 'canPets',
    },
    {
      path: '/pet-gacha',
      name: 'petGachaRatio',
      access: 'canPets',
    },
  ],
};

const breadcrumbGroupMap: Record<string, { title: string; path?: string }> = {
  '/pets/types': { title: '龟种管理', path: '/pets/types' },
  '/pet-features': { title: '龟种管理', path: '/pets/types' },
  '/pet-abilities': { title: '龟种管理', path: '/pets/types' },
  '/pets': { title: '开蛋池配置', path: '/pets' },
  '/pet-gacha': { title: '开蛋池配置', path: '/pets' },
  '/user-management/users': { title: '用户管理', path: '/user-management/users' },
  '/user-management/community': { title: '用户管理', path: '/user-management/users' },
  '/user-management/comments': { title: '用户管理', path: '/user-management/users' },
  '/user-management/audit': { title: '用户管理', path: '/user-management/users' },
  '/user-management/rules': { title: '用户管理', path: '/user-management/users' },
};

function createBreadcrumbItems(pathname: string) {
  const currentPath = pathname === '/dashboard' ? '/' : pathname;
  const currentTitle = pageTitleMap[currentPath] ?? pageTitleMap[pathname] ?? '页面';
  const group = breadcrumbGroupMap[currentPath];

  if (!group || group.title === currentTitle) {
    return [{ title: currentTitle }];
  }

  return [
    {
      title: group.path && group.path !== currentPath ? (
        <a onClick={() => history.push(group.path as string)}>{group.title}</a>
      ) : (
        group.title
      ),
    },
    { title: currentTitle },
  ];
}

function createMenuItem(
  route: AppRouteItem,
  intl: ReturnType<typeof useIntl>,
  access: Record<string, unknown>,
): NonNullable<MenuProps['items']>[number] | undefined {
  if (!route.name || !route.path || route.hideInMenu || publicPaths.has(route.path)) {
    return undefined;
  }

  const children = route.routes
    ?.map((child) => createMenuItem(child, intl, access))
    .filter(Boolean) as MenuProps['items'];
  const canAccessSelf = !route.access || access[route.access] === true;

  if (!canAccessSelf && (!children || children.length === 0)) {
    return undefined;
  }

  return {
    key: route.path,
    icon: menuIconMap[route.name as keyof typeof menuIconMap],
    label: intl.formatMessage({
      id: `menu.${route.name}`,
      defaultMessage: route.name,
    }),
    children: children && children.length > 0 ? children : undefined,
  };
}

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
    () => {
      const items = appRouteManifest
        .map((item) => createMenuItem(item, intl, access))
        .filter(Boolean) as NonNullable<MenuProps['items']>;
      const petMenu = createMenuItem(petManagementMenuRoute, intl, access);
      const petGachaMenu = createMenuItem(petGachaMenuRoute, intl, access);

      if (!petMenu && !petGachaMenu) {
        return items;
      }

      const nodesIndex = items.findIndex((item) => item?.key === '/nodes');
      if (nodesIndex < 0) {
        return [...items, petMenu, petGachaMenu].filter(Boolean) as NonNullable<MenuProps['items']>;
      }

      return [
        ...items.slice(0, nodesIndex + 1),
        petMenu,
        petGachaMenu,
        ...items.slice(nodesIndex + 1),
      ].filter(Boolean) as NonNullable<MenuProps['items']>;
    },
    [access, intl],
  );

  const selectedKeys = useMemo(() => {
    if (location.pathname === '/dashboard') {
      return ['/'];
    }

    return [location.pathname];
  }, [location.pathname]);

  const defaultOpenKeys = useMemo(() => {
    if (location.pathname.startsWith('/user-management/')) {
      return ['/user-management'];
    }

    if (location.pathname.startsWith('/pets/types')) {
      return ['/pet-management'];
    }

    if (location.pathname === '/pet-features' || location.pathname === '/pet-abilities') {
      return ['/pet-management'];
    }

    if (location.pathname === '/pets' || location.pathname === '/pet-gacha') {
      return ['/pet-gacha-management'];
    }

    return [];
  }, [location.pathname]);

  const breadcrumbItems = useMemo(
    () => createBreadcrumbItems(location.pathname),
    [location.pathname],
  );

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
              defaultOpenKeys={defaultOpenKeys}
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
            <Breadcrumb className="turtle-app-breadcrumb" items={breadcrumbItems} />
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
