import { defineConfig } from '@umijs/max';
import { resolveDevProxyTarget } from './serverHosts';
import routes from './routes';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  request: {},
  initialState: {},
  // spine-canvas 为 ESM，MFSU 预构建容器无法正确暴露，需排除后由应用直接打包
  mfsu: {
    exclude: ['@esotericsoftware/spine-canvas', '@esotericsoftware/spine-core'],
  },
  /**
   * 本地开发：`/api` 代理目标由 `UMI_APP_API_ENV` 决定：
   * - staging → https://52.220.192.18（默认）
   * - test → https://52.220.26.101
   * - production → https://52.74.160.160
   * 或使用 `pnpm dev:test` 等脚本。
   */
  proxy:
    process.env.NODE_ENV === 'development'
      ? {
          '/api': {
            target: resolveDevProxyTarget(),
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
