import { AlertOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Empty,
  Input,
  Modal,
  Segmented,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  btlStatusLabel,
  type BtlStatus,
} from '@/data/admin_mock_data';
import type { AdminBattle } from '@/data/admin_mock_data';
import {
  getBattleStatusColor,
  panelStyle,
} from '@/features/admin/shared';
import { useRequestBattles, useRequestResolveBattle } from '@/hooks/useAdminRequest';

export default function BattlePage() {
  const { message } = App.useApp();
  const [filter, setFilter] = useState<BtlStatus | 'ALL'>('ALL');
  const [resolveModal, setResolveModal] = useState<AdminBattle | null>(null);
  const [resolveChoice, setResolveChoice] = useState<'A' | 'B' | 'VOID'>('A');
  const [resolveReason, setResolveReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [enablePenalty, setEnablePenalty] = useState(false);
  const battlesRequest = useRequestBattles();
  const resolveBattleRequest = useRequestResolveBattle();

  useEffect(() => {
    void battlesRequest.run({
      current: 1,
      pageSize: 200,
    });
    // Load the full battle list once, then filter locally for stable tab counters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const battles = useMemo(() => battlesRequest.data?.data || [], [battlesRequest.data?.data]);
  const disputedCount = battles.filter((item) => item.status === 'disputed').length;

  const counts = useMemo(() => {
    const next: Record<string, number> = { ALL: battles.length };
    for (const item of battles) {
      next[item.status] = (next[item.status] || 0) + 1;
    }
    return next;
  }, [battles]);

  const filtered = useMemo(() => {
    if (filter === 'ALL') {
      return battles;
    }

    return battles.filter((item) => item.status === filter);
  }, [battles, filter]);

  const getPenaltyText = (choice: 'A' | 'B' | 'VOID') => {
    if (choice === 'A') return '挑战者虚假异议: 正常庄家赢赔付 + 扣除异议者冻结额 10%';
    if (choice === 'B') return '庄家虚假宣布结果: 正常输钱赔付 + 扣除本金 10% + 封号7天';
    return '议题模糊: 挑战者全额退还，庄家扣除 10% + 封号7天';
  };

  const handleResolveBattle = async () => {
    if (!resolveModal) {
      return;
    }

    try {
      await resolveBattleRequest.run({
        battleId: Number(resolveModal.id),
        result:
          resolveChoice === 'A'
            ? 'banker_wins'
            : resolveChoice === 'B'
              ? 'banker_loses'
              : 'void',
        remark: [resolveReason, evidenceUrl].filter(Boolean).join('\n'),
        requestId: `battle-resolve-${resolveModal.id}-${Date.now()}`,
      });
      message.success('仲裁裁决已提交');
      setResolveModal(null);
      await battlesRequest.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '裁决失败');
    }
  };

  return (
    <PageContainer title="开战广场管理">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div className="turtle-page-toolbar">
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {battlesRequest.error instanceof Error ? (
              <Alert
                type="error"
                showIcon
                message="对局数据加载失败"
                description={battlesRequest.error.message}
              />
            ) : null}

            {disputedCount > 0 ? (
              <Alert
                type="error"
                showIcon
                message={`有 ${disputedCount} 个对局等待仲裁`}
                action={
                  <Button size="small" type="primary" onClick={() => setFilter('disputed')}>
                    立即处理
                  </Button>
                }
              />
            ) : null}

            <Segmented
              block
              value={filter}
              onChange={(value) => setFilter(value as BtlStatus | 'ALL')}
              options={[
                { label: `全部 (${counts.ALL || 0})`, value: 'ALL' },
                { label: `等待应战 (${counts.waiting || 0})`, value: 'waiting' },
                { label: `对局中 (${counts.active || 0})`, value: 'active' },
                { label: `待宣判 (${counts.pending_declare || 0})`, value: 'pending_declare' },
                { label: `争议中 (${counts.disputed || 0})`, value: 'disputed' },
                { label: `已结算 (${counts.resolved || 0})`, value: 'resolved' },
              ]}
            />
          </Space>
        </div>

        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {!battlesRequest.loading && filtered.length === 0 ? (
            <ProCard style={panelStyle}>
              <Empty description="当前筛选条件下暂无对局数据" />
            </ProCard>
          ) : null}

          {filtered.map((battle) => (
            <ProCard key={battle.id} style={panelStyle}>
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={getBattleStatusColor(battle.status)}>{btlStatusLabel[battle.status]}</Tag>
                  <Typography.Text type="secondary">{battle.id}</Typography.Text>
                  {battle.pendingDeadline ? (
                    <Space size={4}>
                      <ClockCircleOutlined style={{ color: '#ff4d4f' }} />
                      <Typography.Text style={{ color: '#ff4d4f' }}>
                        截止 {battle.pendingDeadline}
                      </Typography.Text>
                    </Space>
                  ) : null}
                </Space>

                <Typography.Title level={4} style={{ margin: 0 }}>
                  {battle.topic}
                </Typography.Title>

                <div
                  style={{
                    borderRadius: 16,
                    padding: 16,
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap',
                  }}
                >
                  <Space>
                    <span style={{ fontSize: 28 }}>{battle.creator.avatar}</span>
                    <div>
                      <Typography.Text strong>{battle.creator.name}</Typography.Text>
                      <div>
                        <Typography.Text type="secondary">{battle.optionA}</Typography.Text>
                      </div>
                    </div>
                  </Space>

                  <div style={{ textAlign: 'center', minWidth: 96 }}>
                    <Typography.Text style={{ fontSize: 22 }}>⚔️</Typography.Text>
                    <div>
                      <Typography.Text strong style={{ color: '#fa8c16' }}>
                        {battle.wager} 币
                      </Typography.Text>
                    </div>
                  </div>

                  <Space>
                    {battle.challenger ? (
                      <>
                        <div style={{ textAlign: 'right' }}>
                          <Typography.Text strong>{battle.challenger.name}</Typography.Text>
                          <div>
                            <Typography.Text type="secondary">{battle.optionB}</Typography.Text>
                          </div>
                        </div>
                        <span style={{ fontSize: 28 }}>{battle.challenger.avatar}</span>
                      </>
                    ) : (
                      <Typography.Text type="secondary">等待挑战者...</Typography.Text>
                    )}
                  </Space>
                </div>

                {battle.status === 'disputed' && battle.disputeReason ? (
                  <Alert
                    type="error"
                    showIcon
                    icon={<AlertOutlined />}
                    message={`争议原因: ${battle.disputeReason}`}
                    description={battle.disputeDeadline ? `截止: ${battle.disputeDeadline}` : undefined}
                  />
                ) : null}

                <Space>
                  {battle.status === 'disputed' ? (
                    <Button
                      type="primary"
                      onClick={() => {
                        setResolveModal(battle);
                        setResolveChoice('A');
                        setResolveReason('');
                        setEvidenceUrl('');
                        setEnablePenalty(false);
                      }}
                    >
                      裁决
                    </Button>
                  ) : null}

                  {['waiting', 'active', 'pending_declare'].includes(battle.status) ? (
                    <Button danger disabled>
                      暂无关闭接口
                    </Button>
                  ) : null}
                </Space>
              </Space>
            </ProCard>
          ))}
        </Space>
      </Space>

      <Modal
        open={Boolean(resolveModal)}
        title="仲裁裁决"
        width={560}
        onCancel={() => setResolveModal(null)}
        onOk={() => void handleResolveBattle()}
        okText="确认裁决"
        cancelText="取消"
        confirmLoading={resolveBattleRequest.loading}
      >
        {resolveModal ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Typography.Text strong>{resolveModal.topic}</Typography.Text>
            {resolveModal.disputeReason ? (
              <Alert type="error" showIcon message={`争议原因: ${resolveModal.disputeReason}`} />
            ) : null}
            <Segmented
              block
              value={resolveChoice}
              onChange={(value) => setResolveChoice(value as 'A' | 'B' | 'VOID')}
              options={[
                { label: `庄家胜 · ${resolveModal.creator.name}`, value: 'A' },
                { label: `挑战者胜 · ${resolveModal.challenger?.name || '—'}`, value: 'B' },
                { label: '作废 · 全额退还', value: 'VOID' },
              ]}
            />
            <Checkbox checked={enablePenalty} onChange={(event) => setEnablePenalty(event.target.checked)}>
              启用违规处罚
            </Checkbox>
            {enablePenalty ? <Alert type="warning" showIcon message={getPenaltyText(resolveChoice)} /> : null}
            <Input.TextArea
              rows={4}
              placeholder="请输入裁决理由..."
              value={resolveReason}
              onChange={(event) => setResolveReason(event.target.value)}
            />
            <Input.TextArea
              rows={3}
              placeholder="证据链接（可选）"
              value={evidenceUrl}
              onChange={(event) => setEvidenceUrl(event.target.value)}
            />
          </Space>
        ) : null}
      </Modal>
    </PageContainer>
  );
}
