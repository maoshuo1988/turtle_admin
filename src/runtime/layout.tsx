import { DefaultFooter } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import defaultSettings from '../../config/defaultSettings';
import { pageTitleMap } from '../../config/routeManifest';
import HeaderActions from '@/components/HeaderActions';
import type { AppInitialState } from '@/types/runtime';
import { LOGIN_PATH } from '@/utils/auth';

export function createRuntimeLayout(initialState?: AppInitialState) {
  return {
    rightContentRender: () => <HeaderActions />,
    menuHeaderRender: undefined,
    title: defaultSettings.title,
    footerRender: () => (
      <DefaultFooter
        copyright={`${new Date().getFullYear()} Turtle Admin`}
        links={[]}
      />
    ),
    onPageChange: () => {
      const { pathname } = history.location;
      if (!initialState?.currentUser && pathname !== LOGIN_PATH) {
        history.push(`${LOGIN_PATH}?redirect=${encodeURIComponent(pathname)}`);
      }
    },
    pageTitleRender: (props: { title?: string }) =>
      props.title || pageTitleMap[history.location.pathname] || defaultSettings.title,
    ...initialState?.settings,
  };
}
