/**
 * 后端 API 入口（HTTPS）。
 * - 本地 `max dev`：在 config 里做 `/api` 代理，`target` 由此映射。
 * - `max build`：若设置 `UMI_APP_API_ENV`（或显式 `UMI_APP_SERVER_API`），将把完整 Base 写入前端包。
 */

export const TURTLE_SERVER_HOSTS = {
  /** 原默认 / 过渡环境 */
  staging: 'https://52.220.192.18',
  /** 测试 */
  test: 'https://52.220.26.101',
  /** 生产 */
  production: 'https://52.74.160.160',
} as const;

export type TurtleApiEnv = keyof typeof TURTLE_SERVER_HOSTS;

/** 未设置 `UMI_APP_API_ENV` 时，本地 proxy 指向（与原先单点配置一致） */
export const DEFAULT_DEV_API_ENV: TurtleApiEnv = 'staging';

export function normalizeApiBase(url: string): string {
  return url.replace(/\/+$/, '');
}

function parseApiEnv(raw: string | undefined): TurtleApiEnv | undefined {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (key === 'staging' || key === 'test' || key === 'production') {
    return key;
  }
  return undefined;
}

/** 当前 profile：`UMI_APP_API_ENV=staging|test|production` */
export function getTurtleApiEnv(): TurtleApiEnv {
  return parseApiEnv(process.env.UMI_APP_API_ENV) ?? DEFAULT_DEV_API_ENV;
}

/** 供 `config.ts` proxy `target` 使用 */
export function resolveDevProxyTarget(): string {
  return normalizeApiBase(TURTLE_SERVER_HOSTS[getTurtleApiEnv()]);
}

/**
 * 非 development 时使用：按 `UMI_APP_SERVER_API` 优先，其次 `UMI_APP_API_ENV`；
 * 都未配置则返回 ''（请求走页面同源，常用于静态站 + 反代）。
 */
export function resolveBuiltTurtleApiBase(): string {
  const explicit = String(process.env.UMI_APP_SERVER_API ?? '').trim();
  if (explicit) {
    return normalizeApiBase(explicit);
  }
  const fromEnv = parseApiEnv(process.env.UMI_APP_API_ENV);
  if (fromEnv) {
    return normalizeApiBase(TURTLE_SERVER_HOSTS[fromEnv]);
  }
  return '';
}
