export const ACCESS_TOKEN_KEY = 'turtle-admin.access-token';
export const CURRENT_USER_KEY = 'turtle-admin.current-user';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getStorageItem<T>(key: string): T | undefined {
  if (!isBrowser()) {
    return undefined;
  }

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) {
    return undefined;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return undefined;
  }
}

export function setStorageItem<T>(key: string, value: T) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeStorageItem(key: string) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(key);
}
