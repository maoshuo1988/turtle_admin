import {
  GlobalOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App, Dropdown, Space, Typography } from 'antd';
import { history, setLocale, useIntl, useModel } from '@umijs/max';
import { useRequestSignout } from '@/hooks/useRequest';
import type { AppInitialState } from '@/types/runtime';
import { getUserAvatarText, isAvatarImage, LOGIN_PATH } from '@/utils/auth';

const languageOptions = [
  { key: 'zh-CN', label: '中文' },
  { key: 'en-US', label: 'English' },
];

export default function HeaderActions() {
  const intl = useIntl();
  const { message } = App.useApp();
  const { initialState, setInitialState } = useModel('@@initialState');
  const appState = initialState as AppInitialState | undefined;
  const signoutRequest = useRequestSignout();

  const onLogout = async () => {
    await signoutRequest.run();
    await setInitialState((state) => {
      if (!state) {
        return state;
      }

      return {
        ...state,
        currentUser: undefined,
      };
    });
    history.push(LOGIN_PATH);
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: (
        <Space>
          <UserOutlined />
          <Typography.Text>{appState?.currentUser?.name}</Typography.Text>
        </Space>
      ),
      disabled: true,
    },
    {
      key: 'logout',
      label: (
        <Space>
          <LogoutOutlined />
          <Typography.Text>Logout</Typography.Text>
        </Space>
      ),
      onClick: onLogout,
    },
  ];

  return (
    <Space size={16}>
      <Dropdown
        menu={{
          items: languageOptions.map((item) => ({
            key: item.key,
            label: item.label,
            onClick: () => {
              setLocale(item.key, true);
              message.success(item.label);
            },
          })),
        }}
      >
        <Space style={{ cursor: 'pointer' }}>
          <GlobalOutlined />
          <Typography.Text>
            {intl.locale === 'zh-CN' ? '中文' : 'EN'}
          </Typography.Text>
        </Space>
      </Dropdown>

      <Dropdown menu={{ items: userMenuItems }}>
        <Space style={{ cursor: 'pointer' }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: '#1677ff',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
            }}
          >
            {appState?.currentUser?.avatar && isAvatarImage(appState.currentUser.avatar) ? (
              <img
                alt={appState.currentUser.name}
                src={appState.currentUser.avatar}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              getUserAvatarText(appState?.currentUser)
            )}
          </div>
          <Typography.Text>{appState?.currentUser?.name}</Typography.Text>
        </Space>
      </Dropdown>
    </Space>
  );
}
