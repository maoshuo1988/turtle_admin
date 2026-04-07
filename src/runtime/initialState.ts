import { history } from '@umijs/max';
import defaultSettings from '../../config/defaultSettings';
import { requestUserCurrentQuery } from '@/hooks/useRequest';
import type { AppInitialState } from '@/types/runtime';
import { LOGIN_PATH } from '@/utils/auth';

export async function getAppInitialState(): Promise<AppInitialState> {
  const fetchUserInfo = async () => {
    try {
      return await requestUserCurrentQuery();
    } catch {
      return undefined;
    }
  };

  if (history.location.pathname === LOGIN_PATH) {
    return {
      fetchUserInfo,
      settings: defaultSettings,
    };
  }

  return {
    currentUser: await fetchUserInfo(),
    fetchUserInfo,
    settings: defaultSettings,
  };
}
