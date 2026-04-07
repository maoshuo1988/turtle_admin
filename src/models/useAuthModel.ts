import { useMemo } from 'react';
import { useModel } from '@umijs/max';
import type { AppInitialState } from '@/types/runtime';

interface UseAuthModelResult {
  loading: boolean;
  refresh: () => Promise<void>;
  currentUser: AppInitialState['currentUser'];
  settings: AppInitialState['settings'] | undefined;
}

export default function useAuthModel(): UseAuthModelResult {
  const { initialState, loading, refresh } = useModel('@@initialState');
  const appState = initialState as AppInitialState | undefined;

  return useMemo(
    () => ({
      loading,
      refresh,
      currentUser: appState?.currentUser,
      settings: appState?.settings,
    }),
    [appState?.currentUser, appState?.settings, loading, refresh],
  );
}
