import {
  EditOutlined,
  FireOutlined,
  ReloadOutlined,
  SearchOutlined,
  StarFilled,
  PushpinFilled,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Alert,
  App,
  Button,
  Empty,
  Form,
  Input,
  Modal,
  Progress,
  Segmented,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  mktStatusLabel,
  type AdminMarket,
  type MktStatus,
} from '@/data/admin_mock_data';
import {
  fmtDate,
  fmtNum,
  getMarketStatusColor,
  MetricLine,
  mutedTextStyle,
  panelStyle,
} from '@/features/admin/shared';
import {
  useRequestMarkets,
  useRequestPredictMarketStats,
  useRequestPredictStats,
  useRequestPredictTags,
  useRequestRefreshPredictTags,
  useRequestSettlePredictMarket,
  useRequestUpdatePredictContext,
} from '@/hooks/useAdminRequest';
import type { PredictContextUpdatePayload } from '@/types/admin';

interface PredictContextFormValues {
  eventName: string;
  proText: string;
  conText: string;
  heat?: number;
  participantCount?: number;
  tags?: string;
  detail?: string;
  imageUrl?: string;
}

export default function PredictPage() {
  const { message } = App.useApp();
  const [contextForm] = Form.useForm<PredictContextFormValues>();
  const [filter, setFilter] = useState<MktStatus | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [settleModal, setSettleModal] = useState<AdminMarket | null>(null);
  const [settleChoice, setSettleChoice] = useState<'A' | 'B'>('A');
  const [settleReason, setSettleReason] = useState('');
  const [statsModal, setStatsModal] = useState<AdminMarket | null>(null);
  const [contextModal, setContextModal] = useState<AdminMarket | null>(null);
  const marketsRequest = useRequestMarkets();
  const predictStatsRequest = useRequestPredictStats();
  const marketStatsRequest = useRequestPredictMarketStats();
  const settleMarketRequest = useRequestSettlePredictMarket();
  const refreshTagsRequest = useRequestRefreshPredictTags();
  const updatePredictContextRequest = useRequestUpdatePredictContext();
  const predictTagsRequest = useRequestPredictTags();

  const loadMarkets = async () => {
    await marketsRequest.run({
      current: 1,
      pageSize: 200,
      status: filter === 'ALL' ? undefined : filter,
      keyword: search,
    });
  };

  useEffect(() => {
    void loadMarkets();
    // Market list reloads only when local筛选条件发生变化。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search]);

  const counts = useMemo(() => {
    const next: Record<string, number> = {
      ALL:
        (predictStatsRequest.data?.openCount || 0) +
        (predictStatsRequest.data?.closedCount || 0) +
        (predictStatsRequest.data?.settledCount || 0),
      OPEN: predictStatsRequest.data?.openCount || 0,
      CLOSED: predictStatsRequest.data?.closedCount || 0,
      SETTLED: predictStatsRequest.data?.settledCount || 0,
      VOIDED: 0,
    };

    for (const item of marketsRequest.data?.data || []) {
      if (item.status === 'VOIDED') {
        next.VOIDED += 1;
        next.ALL += 1;
      }
    }

    if (!next.ALL) {
      next.ALL = marketsRequest.data?.total || 0;
    }

    return next;
  }, [marketsRequest.data?.data, marketsRequest.data?.total, predictStatsRequest.data]);

  const filtered = marketsRequest.data?.data || [];

  const openStatsModal = async (market: AdminMarket) => {
    setStatsModal(market);
    try {
      await marketStatsRequest.run(market.id);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '盘口统计加载失败');
    }
  };

  const openSettleModal = async (market: AdminMarket) => {
    setSettleModal(market);
    setSettleChoice('A');
    setSettleReason('');
    try {
      await marketStatsRequest.run(market.id);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '盘口统计加载失败');
    }
  };

  const handleSettleMarket = async () => {
    if (!settleModal) {
      return;
    }

    try {
      await settleMarketRequest.run({
        marketId: settleModal.id,
        result: settleChoice,
        remark: settleReason,
        requestId: `market-settle-${settleModal.id}-${Date.now()}`,
      });
      message.success('市场结算成功');
      setSettleModal(null);
      await Promise.all([loadMarkets(), predictStatsRequest.refresh()]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '市场结算失败');
    }
  };

  const openContextModal = (market: AdminMarket) => {
    setContextModal(market);
    contextForm.setFieldsValue({
      eventName: market.title,
      proText: market.proText,
      conText: market.conText,
      heat: market.heat,
      participantCount: market.betCount,
      tags: market.tags.join(', '),
      detail: market.settleReason,
      imageUrl: '',
    });
  };

  const handleUpdateContext = async () => {
    if (!contextModal) {
      return;
    }

    try {
      const values = await contextForm.validateFields();
      const payload: PredictContextUpdatePayload = {
        marketId: contextModal.id,
        eventName: values.eventName,
        proText: values.proText,
        conText: values.conText,
        heat: values.heat,
        participantCount: values.participantCount,
        tags: values.tags,
        detail: values.detail,
        imageUrl: values.imageUrl,
      };
      await updatePredictContextRequest.run(payload);
      message.success('市场上下文已更新');
      setContextModal(null);
      contextForm.resetFields();
      await loadMarkets();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const options = [
    { label: `全部 (${counts.ALL || 0})`, value: 'ALL' },
    { label: `进行中 (${counts.OPEN || 0})`, value: 'OPEN' },
    { label: `已关闭 (${counts.CLOSED || 0})`, value: 'CLOSED' },
    { label: `已结算 (${counts.SETTLED || 0})`, value: 'SETTLED' },
    { label: `已作废 (${counts.VOIDED || 0})`, value: 'VOIDED' },
  ];

  return (
    <PageContainer title="预测市场管理">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div className="turtle-page-toolbar">
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {marketsRequest.error instanceof Error ? (
              <Alert
                type="error"
                showIcon
                message="预测市场加载失败"
                description={marketsRequest.error.message}
              />
            ) : null}

            <ProCard style={panelStyle}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
                <Input
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="搜索市场..."
                  style={{ width: 280 }}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  loading={refreshTagsRequest.loading || marketsRequest.loading}
                  onClick={async () => {
                    try {
                      await refreshTagsRequest.run();
                      message.success('标签物化刷新完成');
                    } catch (error) {
                      message.error(error instanceof Error ? error.message : '标签刷新失败');
                    } finally {
                      await loadMarkets();
                    }
                  }}
                >
                  刷新标签
                </Button>
              </Space>
            </ProCard>

            <ProCard style={panelStyle}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Typography.Text strong>预测标签词库</Typography.Text>
                {predictTagsRequest.error instanceof Error ? (
                  <Alert type="error" showIcon message="标签词库加载失败" description={predictTagsRequest.error.message} />
                ) : (
                  <Space wrap>
                    {(predictTagsRequest.data || []).slice(0, 20).map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                    {!(predictTagsRequest.data || []).length ? (
                      <Typography.Text type="secondary">暂无标签词库数据</Typography.Text>
                    ) : null}
                  </Space>
                )}
              </Space>
            </ProCard>

            <Segmented
              block
              options={options}
              value={filter}
              onChange={(value) => setFilter(value as MktStatus | 'ALL')}
            />
          </Space>
        </div>

        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {!marketsRequest.loading && filtered.length === 0 ? (
            <ProCard style={panelStyle}>
              <Empty description="当前筛选条件下暂无市场数据" />
            </ProCard>
          ) : null}

          {filtered.map((market) => {
            const total = market.poolA + market.poolB;
            const pctA = total ? Math.round((market.poolA / total) * 100) : 50;
            const pctB = 100 - pctA;
            const oddsA = total ? (total / market.poolA).toFixed(2) : '—';
            const oddsB = total ? (total / market.poolB).toFixed(2) : '—';

            return (
              <ProCard key={market.id} style={panelStyle}>
                <Space direction="vertical" size={14} style={{ width: '100%' }}>
                  <Space wrap>
                    <Tag color={getMarketStatusColor(market.status)}>{mktStatusLabel[market.status]}</Tag>
                    <Typography.Text style={mutedTextStyle}>#{market.id}</Typography.Text>
                    <Tag>{market.source}</Tag>
                    {market.isPinned ? <PushpinFilled style={{ color: '#1677ff' }} /> : null}
                    {market.isRecommended ? <StarFilled style={{ color: '#faad14' }} /> : null}
                  </Space>

                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {market.title}
                  </Typography.Title>

                  <div>
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <Typography.Text style={{ color: '#344054' }}>
                        正方: {market.proText} ({pctA}%)
                      </Typography.Text>
                      <Typography.Text style={{ color: '#344054' }}>
                        反方: {market.conText} ({pctB}%)
                      </Typography.Text>
                    </Space>
                    <Progress
                      percent={pctA}
                      showInfo={false}
                      strokeColor="#1677ff"
                      trailColor="#fa8c16"
                    />
                  </div>

                  <Space wrap size={[16, 8]}>
                    <MetricLine label="投注数" value={market.betCount} />
                    <MetricLine label="总金额" value={fmtNum(total)} />
                    <MetricLine label="赔率A" value={`x${oddsA}`} valueColor="#1677ff" />
                    <MetricLine label="赔率B" value={`x${oddsB}`} valueColor="#fa8c16" />
                    <MetricLine label="截止" value={fmtDate(market.closeTime)} />
                    <MetricLine
                      label="热度"
                      value={market.heat}
                      icon={<FireOutlined style={{ color: '#ff4d4f' }} />}
                    />
                  </Space>

                  <Space wrap>
                    {market.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </Space>

                  {(market.status === 'SETTLED' || market.status === 'VOIDED') && (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: market.status === 'SETTLED' ? '#f6ffed' : '#fff2f0',
                      }}
                    >
                      <Space wrap>
                        <Typography.Text strong>
                          {market.status === 'SETTLED'
                            ? `结算结果: ${market.outcome === 'A' ? market.proText : market.conText}`
                            : '已作废'}
                        </Typography.Text>
                        <Typography.Text>操作人: {market.settledBy}</Typography.Text>
                        <Typography.Text>原因: {market.settleReason}</Typography.Text>
                      </Space>
                    </div>
                  )}

                  {(market.status === 'OPEN' || market.status === 'CLOSED') && (
                    <Space>
                      <Button icon={<EditOutlined />} onClick={() => openContextModal(market)}>
                        编辑上下文
                      </Button>
                      <Button onClick={() => void openStatsModal(market)}>盘口统计</Button>
                      <Button
                        type="primary"
                        onClick={() => {
                          void openSettleModal(market);
                        }}
                      >
                        结算
                      </Button>
                    </Space>
                  )}
                </Space>
              </ProCard>
            );
          })}
        </Space>
      </Space>

      <Modal
        open={Boolean(settleModal)}
        title="人工结算"
        onCancel={() => setSettleModal(null)}
        onOk={() => void handleSettleMarket()}
        okText="确认结算"
        cancelText="取消"
        confirmLoading={settleMarketRequest.loading}
      >
        {settleModal ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Typography.Text>{settleModal.title}</Typography.Text>
            {marketStatsRequest.data ? (
              <Alert
                type="info"
                showIcon
                message={`正方 ${marketStatsRequest.data.proAmount} / 反方 ${marketStatsRequest.data.conAmount}`}
                description={`投注人数 ${marketStatsRequest.data.proUserCount}:${marketStatsRequest.data.conUserCount}，总下注 ${marketStatsRequest.data.totalAmount}`}
              />
            ) : null}
            <Segmented
              block
              value={settleChoice}
              onChange={(value) => setSettleChoice(value as 'A' | 'B')}
              options={[
                { label: settleModal.proText, value: 'A' },
                { label: settleModal.conText, value: 'B' },
              ]}
            />
            <Input.TextArea
              rows={4}
              placeholder="请输入操作原因..."
              value={settleReason}
              onChange={(event) => setSettleReason(event.target.value)}
            />
          </Space>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(statsModal)}
        title="盘口统计"
        onCancel={() => setStatsModal(null)}
        footer={null}
      >
        {statsModal && marketStatsRequest.data ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Typography.Text>{statsModal.title}</Typography.Text>
            <Space wrap>
              <Tag color="processing">正方人数 {marketStatsRequest.data.proUserCount}</Tag>
              <Tag color="warning">反方人数 {marketStatsRequest.data.conUserCount}</Tag>
              <Tag>总下注 {marketStatsRequest.data.totalAmount}</Tag>
              <Tag>总笔数 {marketStatsRequest.data.totalBetCount}</Tag>
            </Space>
            <Typography.Text>正方金额：{marketStatsRequest.data.proAmount}</Typography.Text>
            <Typography.Text>反方金额：{marketStatsRequest.data.conAmount}</Typography.Text>
          </Space>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(contextModal)}
        title="编辑市场上下文"
        onCancel={() => {
          setContextModal(null);
          contextForm.resetFields();
        }}
        onOk={() => void handleUpdateContext()}
        okText="保存"
        cancelText="取消"
        confirmLoading={updatePredictContextRequest.loading}
        destroyOnClose
      >
        <Form form={contextForm} layout="vertical">
          <Form.Item
            name="eventName"
            label="事件标题"
            rules={[{ required: true, message: '请输入事件标题' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="proText"
            label="正方文案"
            rules={[{ required: true, message: '请输入正方文案' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="conText"
            label="反方文案"
            rules={[{ required: true, message: '请输入反方文案' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Input placeholder="多个标签用逗号分隔" />
          </Form.Item>
          <Form.Item name="participantCount" label="参与人数">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="heat" label="热度">
            <Input type="number" />
          </Form.Item>
          <Form.Item name="imageUrl" label="封面图地址">
            <Input />
          </Form.Item>
          <Form.Item name="detail" label="上下文说明">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
