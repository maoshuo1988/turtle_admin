import {
  CrownOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProCard,
  ProFormText,
  ProTable,
  QueryFilter,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  Alert,
  App,
  Button,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Tag,
  Typography,
  type MenuProps,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import UserAvatar from '@/components/UserAvatar';
import { panelStyle } from '@/features/admin/shared';
import {
  useRequestForbiddenUser,
  useRequestGrantAdmin,
  useRequestMintCoins,
  useRequestRevokeAdmin,
  useRequestUsers,
} from '@/hooks/useUserManagementRequest';
import type { AdminUserRecord } from '@/types/admin';

interface UserFilterValues {
  id?: number;
  username?: string;
  nickname?: string;
  email?: string;
}

const DEFAULT_PAGE_SIZE = 20;

function parseOptionalUserId(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return undefined;
  }

  return Math.trunc(num);
}

export default function UsersPage() {
  const { message } = App.useApp();
  const [mintForm] = Form.useForm<{ amount: number; remark?: string }>();
  const [mintModalUser, setMintModalUser] = useState<AdminUserRecord | null>(null);
  const [filters, setFilters] = useState<UserFilterValues>({});
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const usersRequest = useRequestUsers();
  const forbiddenUserRequest = useRequestForbiddenUser();
  const grantAdminRequest = useRequestGrantAdmin();
  const revokeAdminRequest = useRequestRevokeAdmin();
  const mintCoinsRequest = useRequestMintCoins();

  const loadUsers = async (
    nextFilters: UserFilterValues = filters,
    nextPagination = pagination,
  ) => {
    try {
      await usersRequest.run({
        current: nextPagination.current,
        pageSize: nextPagination.pageSize,
        id: nextFilters.id,
        username: nextFilters.username?.trim() || undefined,
        nickname: nextFilters.nickname?.trim() || undefined,
        email: nextFilters.email?.trim() || undefined,
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '用户列表加载失败');
    }
  };

  useEffect(() => {
    void loadUsers({}, { current: 1, pageSize: DEFAULT_PAGE_SIZE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userRecords = useMemo(
    () => usersRequest.data?.data || [],
    [usersRequest.data?.data],
  );

  const handleFilterSubmit = async (values: UserFilterValues) => {
    const nextFilters: UserFilterValues = {
      id: parseOptionalUserId(values.id),
      username: values.username,
      nickname: values.nickname,
      email: values.email,
    };
    const nextPagination = { ...pagination, current: 1 };

    setFilters(nextFilters);
    setPagination(nextPagination);
    await loadUsers(nextFilters, nextPagination);
  };

  const handleFilterReset = () => {
    const nextFilters: UserFilterValues = {};
    const nextPagination = { current: 1, pageSize: DEFAULT_PAGE_SIZE };

    setFilters(nextFilters);
    setPagination(nextPagination);
    void loadUsers(nextFilters, nextPagination);
  };

  const handleTableChange = (page: number, pageSize: number) => {
    const nextPagination = { current: page, pageSize };
    setPagination(nextPagination);
    void loadUsers(filters, nextPagination);
  };

  const refreshUsers = async () => {
    await loadUsers(filters, pagination);
  };

  const handleMuteUser = async (userId: number, days: number) => {
    try {
      await forbiddenUserRequest.run({
        userId,
        days,
      });
      message.success(days === 0 ? '用户已解禁' : '用户已禁言');
      await refreshUsers();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '用户状态更新失败');
    }
  };

  const handleGrantAdmin = async (userId: number) => {
    try {
      await grantAdminRequest.run({ userId });
      message.success('管理员授权成功');
      await refreshUsers();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '授权失败');
    }
  };

  const handleRevokeAdmin = async (userId: number) => {
    try {
      await revokeAdminRequest.run({ userId });
      message.success('管理员权限已取消');
      await refreshUsers();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '取消失败');
    }
  };

  const getUserStatus = (record: AdminUserRecord) => {
    if (record.forbiddenDays || record.status === -1 || record.status === 2) {
      return <Tag color="error">已禁言</Tag>;
    }

    if (record.status === 0 || record.status === undefined) {
      return <Tag color="success">正常</Tag>;
    }

    return <Tag color="default">状态 {record.status}</Tag>;
  };

  const moreActions: MenuProps['items'] = [
    {
      key: 'mute',
      icon: <StopOutlined />,
      label: '禁言 7 天',
    },
    {
      key: 'unmute',
      icon: <UndoOutlined />,
      label: '解禁',
    },
    {
      type: 'divider',
    },
    {
      key: 'grant-admin',
      icon: <CrownOutlined />,
      label: '授权管理员',
    },
    {
      key: 'revoke-admin',
      label: '取消管理员',
    },
  ];

  const handleMoreAction = async (key: string, record: AdminUserRecord) => {
    if (key === 'mute') {
      await handleMuteUser(record.id, 7);
      return;
    }

    if (key === 'unmute') {
      await handleMuteUser(record.id, 0);
      return;
    }

    if (key === 'grant-admin') {
      await handleGrantAdmin(record.id);
      return;
    }

    if (key === 'revoke-admin') {
      await handleRevokeAdmin(record.id);
    }
  };

  const formatNumber = (value?: number) => (value ?? 0).toLocaleString();

  const openMintModal = (user: AdminUserRecord) => {
    setMintModalUser(user);
    mintForm.setFieldsValue({
      amount: 100,
      remark: '',
    });
  };

  const closeMintModal = () => {
    setMintModalUser(null);
    mintForm.resetFields();
  };

  const handleMintCoins = async () => {
    if (!mintModalUser) {
      return;
    }

    try {
      const values = await mintForm.validateFields();
      await mintCoinsRequest.run({
        userId: mintModalUser.id,
        amount: values.amount,
        remark: values.remark?.trim() || undefined,
      });
      message.success('发币成功');
      closeMintModal();
      await refreshUsers();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const columns: ProColumns<AdminUserRecord>[] = [
    {
      title: '头像',
      width: 72,
      render: (_, record) => (
        <UserAvatar
          userId={record.id}
          avatar={record.avatar}
          alt={record.nickname || record.username || `用户 ${record.id}`}
          size={36}
        />
      ),
    },
    { title: 'ID', dataIndex: 'id', width: 80 },
    {
      title: '用户名',
      dataIndex: 'username',
      width: 160,
      render: (_, record) => record.username || '-',
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      width: 160,
      render: (_, record) => record.nickname || record.username || `用户 ${record.id}`,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      width: 220,
      render: (_, record) => record.email || '-',
    },
    {
      title: '状态',
      width: 180,
      render: (_, record) => (
        <Space wrap>
          {getUserStatus(record)}
          {String(record.raw.role || '').includes('admin') ? <Tag color="processing">管理员</Tag> : null}
        </Space>
      ),
    },
    {
      title: '积分',
      dataIndex: 'points',
      width: 120,
      align: 'right',
      render: (_, record) => <Typography.Text>{formatNumber(record.points)}</Typography.Text>,
    },
    {
      title: '余额',
      dataIndex: 'balance',
      width: 120,
      align: 'right',
      render: (_, record) => <Typography.Text>{formatNumber(record.balance)}</Typography.Text>,
    },
    {
      title: '操作',
      width: 160,
      fixed: 'right',
      valueType: 'option',
      render: (_, record) => (
        <Space wrap>
          <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openMintModal(record)}>
            发币
          </Button>
          <Dropdown
            menu={{
              items: moreActions,
              onClick: ({ key }) => void handleMoreAction(key, record),
            }}
          >
            <Button
              size="small"
              icon={<MoreOutlined />}
              loading={forbiddenUserRequest.loading || grantAdminRequest.loading || revokeAdminRequest.loading}
            >
              更多
            </Button>
          </Dropdown>
        </Space>
      ),
    },
  ];

  const usersError = usersRequest.error instanceof Error ? usersRequest.error : undefined;

  return (
    <PageContainer title="用户管理">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {usersError ? (
          <Alert type="error" showIcon message="用户列表加载失败" description={usersError.message} />
        ) : null}

        <ProCard style={panelStyle}>
          <QueryFilter<UserFilterValues>
            defaultCollapsed={false}
            labelWidth="auto"
            span={6}
            onFinish={handleFilterSubmit}
            onReset={handleFilterReset}
          >
            <Form.Item name="id" label="用户 ID">
              <InputNumber min={1} precision={0} placeholder="精确匹配" style={{ width: '100%' }} />
            </Form.Item>
            <ProFormText name="username" label="用户名" placeholder="支持模糊搜索" />
            <ProFormText name="nickname" label="昵称" placeholder="支持模糊搜索" />
            <ProFormText name="email" label="邮箱" placeholder="支持模糊搜索" />
          </QueryFilter>
        </ProCard>

        <ProTable<AdminUserRecord>
          headerTitle="用户列表"
          style={panelStyle}
          search={false}
          options={false}
          toolBarRender={() => [
            <Button key="refresh" icon={<ReloadOutlined />} onClick={() => void refreshUsers()}>
              刷新
            </Button>,
          ]}
          tableAlertRender={false}
          tableAlertOptionRender={false}
          rowKey="id"
          loading={usersRequest.loading}
          dataSource={userRecords}
          scroll={{ x: 980 }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: usersRequest.data?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => handleTableChange(page, pageSize),
          }}
          columns={columns}
        />
      </Space>

      <Modal
        open={Boolean(mintModalUser)}
        title={mintModalUser ? `给 ${mintModalUser.nickname || mintModalUser.username || `用户 ${mintModalUser.id}`} 发币` : '发币'}
        okText="确认发币"
        cancelText="取消"
        confirmLoading={mintCoinsRequest.loading}
        onOk={() => void handleMintCoins()}
        onCancel={closeMintModal}
        destroyOnHidden
      >
        <Form form={mintForm} layout="vertical">
          <Form.Item
            label="发放数量"
            name="amount"
            rules={[
              { required: true, message: '请输入发币数量' },
              { type: 'number', min: 1, message: '发币数量必须大于 0' },
            ]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="请输入整数数量" />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} maxLength={200} placeholder="选填，例如：活动奖励、人工补偿" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
