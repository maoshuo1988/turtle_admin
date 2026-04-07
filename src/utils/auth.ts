import { rolePermissions } from '@/core/access/permissions';
import type { CurrentUser, LoginResult, RemoteAuthUser, UserRole } from '@/types/auth';
import {
  ACCESS_TOKEN_KEY,
  CURRENT_USER_KEY,
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from './storage';

export const LOGIN_PATH = '/login';
const DEFAULT_ROLE: UserRole = 'super_admin';

function isUserRole(role: unknown): role is UserRole {
  return role === 'super_admin' || role === 'operator' || role === 'risk' || role === 'auditor';
}

function resolveUserRole(role: unknown): UserRole {
  return isUserRole(role) ? role : DEFAULT_ROLE;
}

function toText(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function resolveUserName(user: RemoteAuthUser | CurrentUser) {
  return (
    toText(user.nickname) ||
    toText(user.username) ||
    toText(user.email) ||
    ('name' in user ? toText(user.name) : undefined) ||
    '管理员'
  );
}

export function normalizeCurrentUser(user: RemoteAuthUser | CurrentUser | undefined) {
  if (!user) {
    return undefined;
  }

  const role = resolveUserRole(user.role);

  return {
    id: String(user.id ?? user.username ?? user.email ?? '0'),
    name: resolveUserName(user),
    avatar: toText(user.avatar),
    email: toText(user.email),
    username: toText(user.username),
    nickname: toText(user.nickname),
    role,
    locale: user.locale === 'en-US' ? 'en-US' : 'zh-CN',
    permissions: Array.isArray((user as CurrentUser).permissions)
      ? (user as CurrentUser).permissions
      : rolePermissions[role],
    raw: user as unknown as Record<string, unknown>,
  } satisfies CurrentUser;
}

export function persistAuth(result: LoginResult) {
  setStorageItem(ACCESS_TOKEN_KEY, result.accessToken);
  setStorageItem(CURRENT_USER_KEY, result.currentUser);
}

export function clearAuthStorage() {
  removeStorageItem(ACCESS_TOKEN_KEY);
  removeStorageItem(CURRENT_USER_KEY);
}

export function getAccessToken() {
  return getStorageItem<string>(ACCESS_TOKEN_KEY);
}

export function isAvatarImage(avatar?: string) {
  if (!avatar) {
    return false;
  }

  return /^(https?:)?\/\//.test(avatar) || avatar.startsWith('data:image/') || avatar.startsWith('/');
}

export function getUserAvatarText(
  user: Pick<CurrentUser, 'avatar' | 'name' | 'nickname' | 'username' | 'email'> | undefined,
) {
  if (!user) {
    return '管';
  }

  if (user.avatar && !isAvatarImage(user.avatar)) {
    return user.avatar.slice(0, 2);
  }

  const seed = user.nickname || user.username || user.name || user.email || '管理员';
  return seed.slice(0, 1).toUpperCase();
}

export function getCurrentUserFromStorage() {
  const currentUser = normalizeCurrentUser(
    getStorageItem<CurrentUser | RemoteAuthUser>(CURRENT_USER_KEY),
  );

  if (currentUser) {
    setStorageItem(CURRENT_USER_KEY, currentUser);
  }

  return currentUser;
}
