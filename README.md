# Turtle Admin

基于 `Umi Max + Ant Design + ProComponents` 的运营后台，当前已经接好这些基础能力：

- 自定义应用壳：`src/layouts/index.tsx`
- 路由清单：`config/routeManifest.ts`
- 权限映射：`src/access.ts`、`src/core/access/permissions.ts`
- 登录态与本地存储：`src/utils/auth.ts`、`src/utils/storage.ts`
- 请求封装：`src/api`、`src/hooks/useRequest.ts`、`src/hooks/useAdminRequest.ts`
- 宠物运营接口：`src/hooks/usePetAdminRequest.ts`
- 国际化：`src/locales`
- 初始化用户态：`src/runtime/initialState.ts`

## 目录结构

```text
config/
  config.ts
  defaultSettings.ts
  routeManifest.ts
  routes.ts

src/
  app.tsx
  access.ts
  api/
  assets/
  components/
  core/
  data/
  features/
  global.less
  hooks/
  layouts/
  models/
    useAuthModel.ts
  locales/
    zh-CN.ts
    en-US.ts
  pages/
    Login/
    Dashboard/
    Predict/
    Battle/
    Community/
    Comments/
    Nodes/
    Pets/
    PetFeatures/
    Risk/
    Audit/
    Rules/
    403/
    404/
  query/
  runtime/
  types/
  utils/
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

- 所有 HTTP 调用优先收敛到 `src/api/*.ts` 和 `src/hooks/*.ts`
- 公共 headers、401 跳转、响应规范统一放在 `src/api/axios.ts`
- 宠物相关接口统一放在 `src/hooks/usePetAdminRequest.ts`
- 页面组件不要直接写裸 `fetch`

### 做权限控制

- 路由权限放在 `config/routeManifest.ts`
- 页面和菜单权限统一从 `src/access.ts` 生成的 access map 读取
- `Pets / PetFeatures` 已接入路由权限和菜单过滤
- 权限源统一从 `src/access.ts` 生成

### 做国际化

- 菜单标题走 `menu.xxx`
- 页面标题和按钮文案写到 `src/locales`
- 避免把中文硬编码在通用组件里

### 做状态管理

- 页面内临时状态放页面组件
- 全局用户态优先走 `initialState`
- 需要复用的全局状态再下沉到 `src/models`
