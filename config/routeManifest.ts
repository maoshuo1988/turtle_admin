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
    access: 'canDashboard',
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
    access: 'canPredict',
  },
  {
    path: '/battle',
    name: 'battle',
    component: '@/pages/Battle',
    access: 'canBattle',
  },
  {
    path: '/community',
    name: 'community',
    component: '@/pages/Community',
    access: 'canCommunity',
  },
  {
    path: '/comments',
    name: 'comments',
    component: '@/pages/Comments',
    access: 'canComments',
  },
  {
    path: '/nodes',
    name: 'nodes',
    component: '@/pages/Nodes',
    access: 'canNodes',
  },
  {
    path: '/pets',
    name: 'pets',
    component: '@/pages/Pets',
    access: 'canPets',
  },
  {
    path: '/pet-features',
    name: 'petFeatures',
    component: '@/pages/PetFeatures',
    access: 'canPetFeatures',
  },
  {
    path: '/risk',
    name: 'risk',
    component: '@/pages/Risk',
    access: 'canRisk',
  },
  {
    path: '/audit',
    name: 'audit',
    component: '@/pages/Audit',
    access: 'canAudit',
  },
  {
    path: '/rules',
    name: 'rules',
    component: '@/pages/Rules',
    access: 'canRules',
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
  '/pets': '龟种管理',
  '/pet-features': '特性模板',
  '/risk': '风控中心',
  '/audit': '审计日志',
  '/rules': '处罚规则',
};

export function createAppRoutes() {
  return appRouteManifest;
}
