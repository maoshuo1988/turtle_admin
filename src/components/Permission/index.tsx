import type { PropsWithChildren, ReactNode } from 'react';
import { useMemo } from 'react';
import { Result } from 'antd';
import { useModel } from '@umijs/max';
import { hasPermission } from '@/core/access/permissions';
import type { PermissionKey } from '@/types/auth';
import type { AppInitialState } from '@/types/runtime';

interface PermissionProps extends PropsWithChildren {
  permission: PermissionKey;
  fallback?: ReactNode;
}

export function Permission({ permission, fallback = null, children }: PermissionProps) {
  const { initialState } = useModel('@@initialState');
  const appState = initialState as AppInitialState | undefined;
  const allowed = useMemo(
    () => hasPermission(appState?.currentUser, permission),
    [appState?.currentUser, permission],
  );

  return allowed ? <>{children}</> : <>{fallback}</>;
}

export function ForbiddenFallback() {
  return <Result status="403" title="403" subTitle="当前账号没有权限执行这个操作" />;
}
