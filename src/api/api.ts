import { resolveBuiltTurtleApiBase } from '../../config/serverHosts';

/**
 * 开发环境：`''` + config 里 `/api` proxy（目标由 `UMI_APP_API_ENV` 映射）。
 *
 * 生产构建：
 * - 优先 `UMI_APP_SERVER_API`（完整 Origin，可选带路径）。
 * - 否则若设置了 `UMI_APP_API_ENV=staging|test|production`，使用对应后端 IP。
 * - 否则 `''`，请求走静态页同源（需网关反代 `/api`）。
 */
export const TURTLE_API_BASE =
  process.env.NODE_ENV === 'development' ? '' : resolveBuiltTurtleApiBase();

export const API_CONFIG_CONFIGS = '/api/config/configs';
export const API_USER_CURRENT = '/api/user/current';
export const API_BADGE_BADGES = '/api/badge/badges';
export const API_USER_MSG_RECENT = '/api/user/msg_recent';
export const API_UPLOAD_IMAGE = '/api/upload';

export const API_CAPTCHA_REQUEST_ANGLE = '/api/captcha/request_angle';
export const API_CAPTCHA_REQUEST_IMAGE = '/api/captcha/request_image';
export const API_CAPTCHA_VERIFY = '/api/captcha/verify';

export const API_LOGIN_SIGNUP = '/api/login/signup';
export const API_LOGIN_SIGNIN = '/api/login/signin';
export const API_LOGIN_SIGNOUT = '/api/login/signout';
