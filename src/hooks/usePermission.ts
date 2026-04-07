import { useMemo } from 'react';
import { useModel } from '@umijs/max';
import { hasPermission } from '@/core/access/permissions';
import type { PermissionKey } from '@/types/auth';
import type { AppInitialState } from '@/types/runtime';

export function usePermission(permission: PermissionKey) {
  const { initialState } = useModel('@@initialState');
  const appState = initialState as AppInitialState | undefined;

  return useMemo(
    () => hasPermission(appState?.currentUser, permission),
    [appState?.currentUser, permission],
  );
}
