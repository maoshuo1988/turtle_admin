import type { PropsWithChildren } from 'react';
import { history, useModel } from '@umijs/max';
import { Spin } from 'antd';
import type { AppInitialState } from '@/types/runtime';
import { LOGIN_PATH } from '@/utils/auth';

export default function AuthGuard({ children }: PropsWithChildren) {
  const { initialState, loading } = useModel('@@initialState');
  const appState = initialState as AppInitialState | undefined;

  if (loading) {
    return <Spin style={{ marginTop: 64, width: '100%' }} />;
  }

  if (!appState?.currentUser) {
    const redirect = encodeURIComponent(history.location.pathname);
    history.replace(`${LOGIN_PATH}?redirect=${redirect}`);
    return null;
  }

  return <>{children}</>;
}
