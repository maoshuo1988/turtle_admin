import type { CurrentUser, PermissionKey, UserRole } from '@/types/auth';

export const rolePermissions: Record<UserRole, PermissionKey[]> = {
  super_admin: [
    'dashboard.view',
    'predict.view',
    'predict.manage',
    'battle.view',
    'battle.manage',
    'community.view',
    'community.manage',
    'risk.view',
    'risk.manage',
    'audit.view',
    'rules.view',
  ],
  operator: [
    'dashboard.view',
    'predict.view',
    'predict.manage',
    'battle.view',
    'battle.manage',
    'community.view',
    'community.manage',
    'rules.view',
  ],
  risk: ['dashboard.view', 'risk.view', 'risk.manage', 'audit.view', 'rules.view'],
  auditor: ['dashboard.view', 'audit.view', 'rules.view'],
};

export function hasPermission(user: CurrentUser | undefined, permission: PermissionKey) {
  return Boolean(user?.permissions?.includes(permission));
}

export function createAccessMap(currentUser: CurrentUser | undefined) {
  return {
    canDashboard: hasPermission(currentUser, 'dashboard.view'),
    canPredict: hasPermission(currentUser, 'predict.view'),
    canManagePredict: hasPermission(currentUser, 'predict.manage'),
    canBattle: hasPermission(currentUser, 'battle.view'),
    canManageBattle: hasPermission(currentUser, 'battle.manage'),
    canCommunity: hasPermission(currentUser, 'community.view'),
    canManageCommunity: hasPermission(currentUser, 'community.manage'),
    canRisk: hasPermission(currentUser, 'risk.view'),
    canManageRisk: hasPermission(currentUser, 'risk.manage'),
    canAudit: hasPermission(currentUser, 'audit.view'),
    canRules: hasPermission(currentUser, 'rules.view'),
    isLoggedIn: Boolean(currentUser),
    currentUser,
  };
}
