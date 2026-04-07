import type defaultSettings from '../../config/defaultSettings';
import type { CurrentUser } from './auth';

export interface AppInitialState {
  currentUser?: CurrentUser;
  settings: typeof defaultSettings;
  fetchUserInfo: () => Promise<CurrentUser | undefined>;
}
