import { defineConfig } from '@umijs/max';
import routes from './routes';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  request: {},
  initialState: {},
  layout: false,
  locale: {
    default: 'zh-CN',
    antd: true,
    baseNavigator: false,
  },
  npmClient: 'npm',
  routes,
});
