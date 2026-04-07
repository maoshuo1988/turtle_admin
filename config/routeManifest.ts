export interface AppRouteItem {
  path: string;
  name?: string;
  component?: string;
  redirect?: string;
  layout?: boolean;
  access?: string;
  wrappers?: string[];
  hideInMenu?: boolean;
}

export const appRouteManifest: AppRouteItem[] = [
  {
    path: '/login',
    layout: false,
    component: '@/pages/Login',
  },
  {
    path: '/',
    name: 'dashboard',
    component: '@/pages/Dashboard',
  },
  {
    path: '/dashboard',
    redirect: '/',
    hideInMenu: true,
  },
  {
    path: '/predict',
    name: 'predict',
    component: '@/pages/Predict',
  },
  {
    path: '/battle',
    name: 'battle',
    component: '@/pages/Battle',
  },
  {
    path: '/community',
    name: 'community',
    component: '@/pages/Community',
  },
  {
    path: '/comments',
    name: 'comments',
    component: '@/pages/Comments',
  },
  {
    path: '/nodes',
    name: 'nodes',
    component: '@/pages/Nodes',
  },
  {
    path: '/risk',
    name: 'risk',
    component: '@/pages/Risk',
  },
  {
    path: '/audit',
    name: 'audit',
    component: '@/pages/Audit',
  },
  {
    path: '/rules',
    name: 'rules',
    component: '@/pages/Rules',
  },
  {
    path: '/403',
    layout: false,
    component: '@/pages/403',
  },
  {
    path: '*',
    layout: false,
    component: '@/pages/404',
  },
];

export const pageTitleMap: Record<string, string> = {
  '/': '总览看板',
  '/dashboard': '总览看板',
  '/predict': '预测市场',
  '/battle': '开战广场',
  '/community': '社区管理',
  '/comments': '评论管理',
  '/nodes': '节点管理',
  '/risk': '风控中心',
  '/audit': '审计日志',
  '/rules': '处罚规则',
};

export function createAppRoutes() {
  return appRouteManifest;
}
