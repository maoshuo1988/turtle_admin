import {
  GlobalOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { App, Dropdown, Space, Typography } from 'antd';
import { history, setLocale, useIntl, useModel } from '@umijs/max';
import { useRequestSignout } from '@/hooks/useRequest';
import type { AppInitialState } from '@/types/runtime';
import UserAvatar from '@/components/UserAvatar';
import { LOGIN_PATH } from '@/utils/auth';

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
          <UserAvatar
            userId={appState?.currentUser?.id}
            idEncode={appState?.currentUser?.idEncode}
            avatar={appState?.currentUser?.avatar}
            alt={appState?.currentUser?.name}
            size={30}
          />
          <Typography.Text>{appState?.currentUser?.name}</Typography.Text>
        </Space>
      </Dropdown>
    </Space>
  );
}
