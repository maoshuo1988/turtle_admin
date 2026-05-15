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
            target: 'https://turtle.cloud-ip.cc',
            changeOrigin: true,
            secure: true,
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
