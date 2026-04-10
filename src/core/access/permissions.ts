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
    'pet.view',
    'pet.manage',
    'pet.feature.view',
    'pet.feature.manage',
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
    'pet.view',
    'pet.manage',
    'pet.feature.view',
    'pet.feature.manage',
    'rules.view',
  ],
  risk: ['dashboard.view', 'risk.view', 'risk.manage', 'audit.view', 'rules.view'],
  auditor: ['dashboard.view', 'audit.view', 'rules.view'],
};

export function hasPermission(user: CurrentUser | undefined, permission: PermissionKey) {
  return Boolean(user?.permissions?.includes(permission));
}

export function createAccessMap(currentUser: CurrentUser | undefined) {
  const canManageCommunity = hasPermission(currentUser, 'community.manage');

  return {
    canDashboard: hasPermission(currentUser, 'dashboard.view'),
    canPredict: hasPermission(currentUser, 'predict.view'),
    canManagePredict: hasPermission(currentUser, 'predict.manage'),
    canBattle: hasPermission(currentUser, 'battle.view'),
    canManageBattle: hasPermission(currentUser, 'battle.manage'),
    canCommunity: hasPermission(currentUser, 'community.view'),
    canManageCommunity,
    canComments: canManageCommunity,
    canNodes: canManageCommunity,
    canPets: hasPermission(currentUser, 'pet.view'),
    canManagePets: hasPermission(currentUser, 'pet.manage'),
    canPetFeatures: hasPermission(currentUser, 'pet.feature.view'),
    canManagePetFeatures: hasPermission(currentUser, 'pet.feature.manage'),
    canRisk: hasPermission(currentUser, 'risk.view'),
    canManageRisk: hasPermission(currentUser, 'risk.manage'),
    canAudit: hasPermission(currentUser, 'audit.view'),
    canRules: hasPermission(currentUser, 'rules.view'),
    isLoggedIn: Boolean(currentUser),
    currentUser,
  };
}
