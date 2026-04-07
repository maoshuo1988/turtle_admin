import { ArrowUpOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Alert, Button, Col, Row, Space, Table, Tag, Typography } from 'antd';
import {
  actionLabel,
  type OpLog,
} from '@/data/admin_mock_data';
import {
  MiniBarChart,
  mutedTextStyle,
  panelStyle,
  fmtNum,
} from '@/features/admin/shared';
import {
  useRequestBattleActiveUsers,
  useRequestBattleStats,
  useRequestBattleTrends,
  useRequestDashboardStats,
  useRequestDashboardUserReports,
  useRequestPredictActiveUsers,
  useRequestPredictStats,
  useRequestPredictTrends,
  useRequestRecentOperationLogs,
} from '@/hooks/useAdminRequest';
import type { AppInitialState } from '@/types/runtime';

export default function DashboardPage() {
  const { initialState } = useModel('@@initialState');
  const appState = initialState as AppInitialState | undefined;
  const dashboardStatsRequest = useRequestDashboardStats();
  const predictStatsRequest = useRequestPredictStats();
  const predictTrendsRequest = useRequestPredictTrends('7d');
  const activeUsersRequest = useRequestPredictActiveUsers('7d');
  const battleTrendsRequest = useRequestBattleTrends('7d');
  const battleActiveUsersRequest = useRequestBattleActiveUsers('7d');
  const operationLogsRequest = useRequestRecentOperationLogs({ current: 1, pageSize: 5 });
  const battleStatsRequest = useRequestBattleStats();
  const userReportsRequest = useRequestDashboardUserReports({ current: 1, pageSize: 100 });
  const displayName = appState?.currentUser?.nickname || appState?.currentUser?.name || '管理员';

  return (
    <PageContainer
      title="总览看板"
      extra={[
        <Button
          key="refresh"
          type="text"
          onClick={async () => {
            await dashboardStatsRequest.refresh();
            await predictStatsRequest.refresh();
            await predictTrendsRequest.refresh();
            await activeUsersRequest.refresh();
            await battleTrendsRequest.refresh();
            await battleActiveUsersRequest.refresh();
            await operationLogsRequest.refresh();
            await battleStatsRequest.refresh();
            await userReportsRequest.refresh();
          }}
        >
          <Space>
            <ReloadOutlined />
            刷新
          </Space>
        </Button>,
      ]}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {dashboardStatsRequest.error instanceof Error ? (
          <Alert
            type="error"
            showIcon
            message="全站统计加载失败"
            description={dashboardStatsRequest.error.message}
          />
        ) : null}

        <ProCard
          style={{
            ...panelStyle,
            background: 'linear-gradient(120deg, #1677ff 0%, #5b8cff 100%)',
          }}
          bodyStyle={{ padding: 24 }}
        >
          <Typography.Title level={3} style={{ color: '#fff', margin: 0 }}>
            下午好，{displayName}
          </Typography.Title>
          <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.82)', margin: '8px 0 0' }}>
            龟投运营后台 · 让运营更高效
          </Typography.Paragraph>
        </ProCard>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={6}>
            <ProCard style={panelStyle}>
              <Typography.Title level={2} style={{ margin: 0, color: '#101828' }}>
                {fmtNum(predictStatsRequest.data?.todayBetAmount ?? 0)}
              </Typography.Title>
              <Typography.Paragraph style={{ ...mutedTextStyle, marginTop: 8, marginBottom: 10 }}>
                今日下注额
              </Typography.Paragraph>
              <Space size={4}>
                <ArrowUpOutlined style={{ color: '#16a34a', fontSize: 12 }} />
                <Typography.Text style={{ color: '#16a34a', fontSize: 12 }}>
                  实时聚合
                </Typography.Text>
              </Space>
            </ProCard>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <ProCard style={panelStyle}>
              <Typography.Title level={2} style={{ margin: 0, color: '#101828' }}>
                {String(predictStatsRequest.data?.todayNewMarkets ?? 0)}
              </Typography.Title>
              <Typography.Paragraph style={{ ...mutedTextStyle, marginTop: 8, marginBottom: 10 }}>
                今日新增市场
              </Typography.Paragraph>
              <Space size={4}>
                <ArrowUpOutlined style={{ color: '#16a34a', fontSize: 12 }} />
                <Typography.Text style={{ color: '#16a34a', fontSize: 12 }}>
                  管理员统计
                </Typography.Text>
              </Space>
            </ProCard>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <ProCard style={panelStyle}>
              <Typography.Title
                level={2}
                style={{
                  margin: 0,
                  color: Number(battleStatsRequest.data?.pendingCount ?? 0) > 0 ? '#ff4d4f' : '#101828',
                }}
              >
                {String(Number(battleStatsRequest.data?.pendingCount ?? 0))}
              </Typography.Title>
              <Typography.Paragraph style={{ ...mutedTextStyle, marginTop: 8, marginBottom: 10 }}>
                待处理争议
              </Typography.Paragraph>
              <div style={{ height: 22 }} />
            </ProCard>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <ProCard style={panelStyle}>
              <Typography.Title
                level={2}
                style={{
                  margin: 0,
                  color:
                    (userReportsRequest.data?.data ?? []).filter((item) => item.auditStatus === 0).length > 0
                      ? '#fa8c16'
                      : '#101828',
                }}
              >
                {String((userReportsRequest.data?.data ?? []).filter((item) => item.auditStatus === 0).length)}
              </Typography.Title>
              <Typography.Paragraph style={{ ...mutedTextStyle, marginTop: 8, marginBottom: 10 }}>
                异常告警
              </Typography.Paragraph>
              <div style={{ height: 22 }} />
            </ProCard>
          </Col>
        </Row>

        <Row gutter={[12, 12]}>
          <Col xs={12} md={8} lg={4} xl={4} flex="1 0 0">
            <ProCard style={panelStyle}>
              <Typography.Title level={4} style={{ margin: 0, textAlign: 'center' }}>
                {predictStatsRequest.data?.openCount ?? 0}
              </Typography.Title>
              <Typography.Paragraph style={{ ...mutedTextStyle, margin: '8px 0 0', textAlign: 'center' }}>
                进行中市场
              </Typography.Paragraph>
            </ProCard>
          </Col>
          <Col xs={12} md={8} lg={4} xl={4} flex="1 0 0">
            <ProCard style={panelStyle}>
              <Typography.Title level={4} style={{ margin: 0, textAlign: 'center' }}>
                {predictStatsRequest.data?.settledCount ?? 0}
              </Typography.Title>
              <Typography.Paragraph style={{ ...mutedTextStyle, margin: '8px 0 0', textAlign: 'center' }}>
                已结算市场
              </Typography.Paragraph>
            </ProCard>
          </Col>
          <Col xs={12} md={8} lg={4} xl={4} flex="1 0 0">
            <ProCard style={panelStyle}>
              <Typography.Title level={4} style={{ margin: 0, textAlign: 'center' }}>
                {fmtNum(dashboardStatsRequest.data?.totalUsers ?? 0)}
              </Typography.Title>
              <Typography.Paragraph style={{ ...mutedTextStyle, margin: '8px 0 0', textAlign: 'center' }}>
                总用户
              </Typography.Paragraph>
            </ProCard>
          </Col>
          <Col xs={12} md={8} lg={4} xl={4} flex="1 0 0">
            <ProCard style={panelStyle}>
              <Typography.Title level={4} style={{ margin: 0, textAlign: 'center' }}>
                {fmtNum(dashboardStatsRequest.data?.totalTopics ?? 0)}
              </Typography.Title>
              <Typography.Paragraph style={{ ...mutedTextStyle, margin: '8px 0 0', textAlign: 'center' }}>
                总帖子
              </Typography.Paragraph>
            </ProCard>
          </Col>
          <Col xs={12} md={8} lg={4} xl={4} flex="1 0 0">
            <ProCard style={panelStyle}>
              <Typography.Title level={4} style={{ margin: 0, textAlign: 'center' }}>
                {fmtNum(dashboardStatsRequest.data?.totalComments ?? 0)}
              </Typography.Title>
              <Typography.Paragraph style={{ ...mutedTextStyle, margin: '8px 0 0', textAlign: 'center' }}>
                总评论
              </Typography.Paragraph>
            </ProCard>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <ProCard style={panelStyle}>
              <MiniBarChart
                data={predictTrendsRequest.data ?? []}
                color="#1677ff"
                label="近7日预测市场趋势"
              />
            </ProCard>
          </Col>
          <Col xs={24} lg={12}>
            <ProCard style={panelStyle}>
              <MiniBarChart
                data={activeUsersRequest.data ?? []}
                color="#16a34a"
                label="近7日活跃下注用户"
              />
            </ProCard>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <ProCard style={panelStyle}>
              <MiniBarChart
                data={battleTrendsRequest.data ?? []}
                color="#fa8c16"
                label="近7日开战对局趋势"
              />
            </ProCard>
          </Col>
          <Col xs={24} lg={12}>
            <ProCard style={panelStyle}>
              <MiniBarChart
                data={battleActiveUsersRequest.data ?? []}
                color="#722ed1"
                label="近7日开战活跃用户"
              />
            </ProCard>
          </Col>
        </Row>

        <ProCard title="最近操作" style={panelStyle}>
          <Table
            rowKey="id"
            pagination={false}
            loading={operationLogsRequest.loading}
            dataSource={operationLogsRequest.data?.data ?? []}
            columns={[
              {
                title: '时间',
                dataIndex: 'time',
                width: 120,
                render: (value: string) => (
                  <Typography.Text style={mutedTextStyle}>{value}</Typography.Text>
                ),
              },
              {
                title: '操作人',
                dataIndex: 'operator',
                width: 160,
                render: (value: string, record: OpLog) => (
                  <Space>
                    <Typography.Text strong>{value}</Typography.Text>
                    <Tag>{record.role}</Tag>
                  </Space>
                ),
              },
              {
                title: '操作类型',
                dataIndex: 'action',
                width: 140,
                render: (value: keyof typeof actionLabel) => (
                  <Tag color="processing">{actionLabel[value]}</Tag>
                ),
              },
              {
                title: '详情',
                dataIndex: 'detail',
              },
            ]}
          />
        </ProCard>
      </Space>
    </PageContainer>
  );
}
