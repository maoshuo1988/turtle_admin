export type UserRole = 'super_admin' | 'operator' | 'risk' | 'auditor';

export type PermissionKey =
  | 'dashboard.view'
  | 'predict.view'
  | 'predict.manage'
  | 'battle.view'
  | 'battle.manage'
  | 'community.view'
  | 'community.manage'
  | 'pet.view'
  | 'pet.manage'
  | 'pet.feature.view'
  | 'pet.feature.manage'
  | 'risk.view'
  | 'risk.manage'
  | 'audit.view'
  | 'rules.view';

export interface CurrentUser {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  username?: string;
  nickname?: string;
  role: UserRole;
  locale: 'zh-CN' | 'en-US';
  permissions: PermissionKey[];
  raw?: Record<string, unknown>;
}

export interface LoginPayload {
  account: string;
  password: string;
  captchaId: string;
  captchaCode: string;
  captchaProtocol: number;
}

export interface LoginResult {
  accessToken: string;
  currentUser: CurrentUser;
  rawUser?: RemoteAuthUser;
}

export interface ImageCaptchaPayload {
  captchaId: string;
  captchaBase64: string;
}

export interface RemoteAuthUser {
  id?: string | number;
  username?: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  role?: string;
  locale?: 'zh-CN' | 'en-US';
  [key: string]: unknown;
}

export interface RemoteLoginResult {
  token?: string;
  user?: RemoteAuthUser;
}
