import { defineConfig } from '@umijs/max';
import routes from './routes';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  request: {},
  initialState: {},
  /** 本地开发将 /api 代理到后端，避免浏览器直连跨域域名触发 CORS */
  proxy:
    process.env.NODE_ENV === 'development'
      ? {
          '/api': {
            target: 'https://52.220.192.18',
            changeOrigin: true,
            // 目标服务当前使用自签名证书，本地 dev proxy 校验证书会直接返回 500。
            secure: false,
          },
        }
      : undefined,
  layout: false,
  locale: {
    default: 'zh-CN',
    antd: true,
    baseNavigator: false,
  },
  npmClient: 'npm',
  routes,
});
