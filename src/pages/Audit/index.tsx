import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Alert, Button, Input, Segmented, Space, Table, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  actionLabel,
  type LogAction,
} from '@/data/admin_mock_data';
import { panelStyle } from '@/features/admin/shared';
import { useRequestFundRecords, useRequestOperationLogs } from '@/hooks/useAdminRequest';

export default function AuditPage() {
  const [tab, setTab] = useState<'ops' | 'fund'>('ops');
  const [actionFilter, setActionFilter] = useState<LogAction | 'ALL'>('ALL');
  const [fundSearch, setFundSearch] = useState('');
  const operationLogsRequest = useRequestOperationLogs();
  const fundRecordsRequest = useRequestFundRecords();

  useEffect(() => {
    void operationLogsRequest.run({ current: 1, pageSize: 200 });
    void fundRecordsRequest.run({ current: 1, pageSize: 200 });
    // Requests only need to run once on page mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLogs = useMemo(
    () =>
      actionFilter === 'ALL'
        ? (operationLogsRequest.data?.data || [])
        : (operationLogsRequest.data?.data || []).filter((item) => item.action === actionFilter),
    [actionFilter, operationLogsRequest.data?.data],
  );

  const filteredFunds = useMemo(() => {
    const records = fundRecordsRequest.data?.data || [];
    if (!fundSearch.trim()) return records;
    return records.filter(
      (item) => item.userName.includes(fundSearch) || item.remark.includes(fundSearch),
    );
  }, [fundRecordsRequest.data?.data, fundSearch]);

  const actionTypes: LogAction[] = [
    'resolve_battle',
    'void_market',
    'settle_market',
    'ban_user',
    'edit_context',
    'sticky_topic',
    'delete_topic',
    'admin_mint',
  ];

  return (
    <PageContainer
      title="审计日志"
      extra={[
        <Button key="export" icon={<DownloadOutlined />}>
          导出
        </Button>,
      ]}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div className="turtle-page-toolbar">
          <Segmented
            block
            options={[
              { label: '操作日志', value: 'ops' },
              { label: '资金流水', value: 'fund' },
            ]}
            value={tab}
            onChange={(value) => setTab(value as 'ops' | 'fund')}
          />
        </div>

        {tab === 'ops' ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div className="turtle-page-toolbar turtle-page-toolbar-with-tabs">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {operationLogsRequest.error instanceof Error ? (
                  <Alert
                    type="error"
                    showIcon
                    message="操作日志加载失败"
                    description={operationLogsRequest.error.message}
                  />
                ) : null}
                <Segmented
                  options={[
                    { label: '全部', value: 'ALL' },
                    ...actionTypes.map((item) => ({ label: actionLabel[item], value: item })),
                  ]}
                  value={actionFilter}
                  onChange={(value) => setActionFilter(value as LogAction | 'ALL')}
                />
              </Space>
            </div>
            <ProCard style={panelStyle}>
              <Table
                rowKey="id"
                loading={operationLogsRequest.loading}
                pagination={false}
                dataSource={filteredLogs}
                columns={[
                  { title: '时间', dataIndex: 'time', width: 120 },
                  { title: '操作人', dataIndex: 'operator', width: 120 },
                  {
                    title: '角色',
                    dataIndex: 'role',
                    width: 100,
                    render: (value: string) => <Tag>{value}</Tag>,
                  },
                  {
                    title: '操作类型',
                    dataIndex: 'action',
                    width: 140,
                    render: (value: LogAction) => <Tag color="processing">{actionLabel[value]}</Tag>,
                  },
                  {
                    title: '目标',
                    dataIndex: 'targetId',
                    width: 140,
                    render: (_, record) => `${record.targetType}/${record.targetId}`,
                  },
                  { title: '详情', dataIndex: 'detail' },
                  { title: 'IP', dataIndex: 'ip', width: 140 },
                ]}
              />
            </ProCard>
          </Space>
        ) : null}

        {tab === 'fund' ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div className="turtle-page-toolbar turtle-page-toolbar-with-tabs">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {fundRecordsRequest.error instanceof Error ? (
                  <Alert
                    type="error"
                    showIcon
                    message="资金流水加载失败"
                    description={fundRecordsRequest.error.message}
                  />
                ) : null}
                <Input
                  allowClear
                  style={{ width: 280 }}
                  prefix={<SearchOutlined />}
                  placeholder="搜索用户/备注..."
                  value={fundSearch}
                  onChange={(event) => setFundSearch(event.target.value)}
                />
              </Space>
            </div>
            <ProCard style={panelStyle}>
              <Table
                rowKey="id"
                loading={fundRecordsRequest.loading}
                pagination={false}
                dataSource={filteredFunds}
                columns={[
                  { title: 'ID', dataIndex: 'id', width: 70 },
                  { title: '用户', dataIndex: 'userName', width: 120 },
                  {
                    title: '类型',
                    dataIndex: 'bizType',
                    width: 140,
                    render: (value: string) => <Tag>{value}</Tag>,
                  },
                  {
                    title: '金额',
                    dataIndex: 'amount',
                    width: 100,
                    render: (value: number) => (
                      <Typography.Text style={{ color: value >= 0 ? '#16a34a' : '#ff4d4f' }}>
                        {value >= 0 ? '+' : ''}
                        {value}
                      </Typography.Text>
                    ),
                  },
                  { title: '余额', dataIndex: 'balanceAfter', width: 100 },
                  { title: '备注', dataIndex: 'remark' },
                  { title: '时间', dataIndex: 'createTime', width: 140 },
                ]}
              />
            </ProCard>
          </Space>
        ) : null}
      </Space>
    </PageContainer>
  );
}
