/**
 * 开发环境配合 config 里 `/api` 代理走同源请求，避免 localhost 调用远程 API 触发 CORS。
 * 生产环境优先使用显式注入的 `UMI_APP_SERVER_API`，未注入时回退到同源，
 * 避免页面挂在某个域名/IP 下时却把请求发到另一台入口。
 */
export const TURTLE_API_BASE =
  process.env.NODE_ENV === 'development' ? '' : (process.env.UMI_APP_SERVER_API || '').trim();

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
