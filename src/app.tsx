import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { App as AntdApp } from 'antd';
import { QueryClientProvider } from 'react-query';
import { queryClient } from './query/client';
import { getAppInitialState } from './runtime/initialState';
import type { AppInitialState } from './types/runtime';
import { setAppMessageApi } from './utils/appMessage';
import './global.less';

function AppMessageBridge() {
  const { message } = AntdApp.useApp();

  useEffect(() => {
    setAppMessageApi(message);
  }, [message]);

  return null;
}

export async function getInitialState(): Promise<AppInitialState> {
  return getAppInitialState();
}

export function rootContainer(container: ReactNode) {
  return (
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <AppMessageBridge />
        {container}
      </AntdApp>
    </QueryClientProvider>
  );
}
