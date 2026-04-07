# Turtle Admin

基于 `Umi Max + Ant Design + ProComponents` 的企业后台骨架，已经把以下基础能力接好：

- 路由与布局：Umi Max runtime layout + 路由菜单
- 权限：`src/access.ts`
- 登录态与本地存储：`src/utils/auth.ts`、`src/utils/storage.ts`
- 国际化：`src/locales`
- 请求运行时：`src/app.tsx` 中的 `request` 配置
- 服务层：`src/services`
- 页面级请求 hook：`src/hooks/usePageQuery.ts`

## 目录结构

```text
config/
  config.ts
  defaultSettings.ts
  routes.ts

src/
  app.tsx
  access.ts
  global.less
  data/
  hooks/
    usePageQuery.ts
  components/
    HeaderActions/
  models/
    useAuthModel.ts
  locales/
    zh-CN.ts
    en-US.ts
  services/
    api.ts
    auth.ts
    dashboard.ts
    admin.ts
    typing.ts
  utils/
    auth.ts
    storage.ts
    format.ts
  pages/
    Login/
    Dashboard/
    Predict/
    Battle/
    Community/
    Risk/
    Audit/
    Rules/
    403/
    404/
```

## 开发命令

```bash
npm install
npm run dev
npm run build
npm run lint
```

## 约定建议

### 接真实接口

- 所有 HTTP 调用优先放到 `src/services/*.ts`
- 公共 headers、token 注入、401 跳转统一放在 `src/app.tsx`
- 页面组件不要直接写裸 `fetch`

### 做权限控制

- 路由权限放在 `config/routes.ts`
- 按钮权限统一从 `useAccess()` 读取
- 权限源统一从 `src/access.ts` 生成

### 做国际化

- 菜单标题走 `menu.xxx`
- 页面标题和按钮文案写到 `src/locales`
- 避免把中文硬编码在通用组件里

### 做状态管理

- 页面内临时状态放页面组件
- 全局用户态优先走 `initialState`
- 需要复用的全局状态再下沉到 `src/models`
