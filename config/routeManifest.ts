export interface AppRouteItem {
  path: string;
  name?: string;
  component?: string;
  redirect?: string;
  layout?: boolean;
  access?: string;
  wrappers?: string[];
  hideInMenu?: boolean;
  routes?: AppRouteItem[];
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
    path: '/pk',
    name: 'pk',
    component: '@/pages/Pk',
    access: 'canPk',
  },
  {
    path: '/community',
    redirect: '/user-management/community',
    hideInMenu: true,
  },
  {
    path: '/comments',
    redirect: '/user-management/comments',
    hideInMenu: true,
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
    path: '/pet-gacha',
    name: 'petGacha',
    component: '@/pages/PetGacha',
    access: 'canPets',
  },
  {
    path: '/user-management',
    name: 'userManagement',
    routes: [
      {
        path: '/user-management',
        redirect: '/user-management/users',
        hideInMenu: true,
      },
      {
        path: '/user-management/users',
        name: 'users',
        component: '@/pages/UserManagement/Users',
        access: 'canRisk',
      },
      {
        path: '/user-management/community',
        name: 'community',
        component: '@/pages/UserManagement/Community',
        access: 'canCommunity',
      },
      {
        path: '/user-management/comments',
        name: 'comments',
        component: '@/pages/UserManagement/Comments',
        access: 'canComments',
      },
      {
        path: '/user-management/audit',
        name: 'audit',
        component: '@/pages/UserManagement/Audit',
        access: 'canAudit',
      },
      {
        path: '/user-management/rules',
        name: 'rules',
        component: '@/pages/UserManagement/Rules',
        access: 'canRules',
      },
    ],
  },
  {
    path: '/users',
    redirect: '/user-management/users',
    hideInMenu: true,
  },
  {
    path: '/risk',
    name: 'risk',
    component: '@/pages/Risk',
    access: 'canRisk',
  },
  {
    path: '/audit',
    redirect: '/user-management/audit',
    hideInMenu: true,
  },
  {
    path: '/rules',
    redirect: '/user-management/rules',
    hideInMenu: true,
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
  '/pk': '对立PK管理',
  '/community': '社区管理',
  '/comments': '评论管理',
  '/user-management/users': '用户管理',
  '/users': '用户管理',
  '/user-management/community': '社区管理',
  '/user-management/comments': '评论管理',
  '/nodes': '节点管理',
  '/pets': '龟种管理',
  '/pet-features': '特性模板',
  '/pet-gacha': '开蛋池配置',
  '/risk': '风控中心',
  '/user-management/audit': '审计日志',
  '/user-management/rules': '处罚规则',
  '/audit': '审计日志',
  '/rules': '处罚规则',
};

export function createAppRoutes() {
  return appRouteManifest;
}
