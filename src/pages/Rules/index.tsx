import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Space, Table, Tag, Typography } from 'antd';
import { panelStyle } from '@/features/admin/shared';
import { useRequestPenaltyRules } from '@/hooks/useAdminRequest';

export default function RulesPage() {
  const penaltyRulesRequest = useRequestPenaltyRules();
  const explanations = [
    {
      color: '#ff4d4f',
      title: '庄家虚假宣布结果',
      detail:
        '当庄家故意宣布错误结果试图欺骗挑战者时，经仲裁确认后，庄家将按照正常输钱赔付，额外扣除本金 10% 作为惩罚，并封号 7 天。这是最严重的违规行为。',
    },
    {
      color: '#fa8c16',
      title: '议题模糊不可判定',
      detail:
        '当对局议题存在歧义，双方理解不同导致无法公正判定时，仲裁将作废该对局。挑战者全额退还押注，庄家作为议题发起方承担责任，扣除 10% 本金并封号 7 天，入场费不退。',
    },
    {
      color: '#1677ff',
      title: '挑战者虚假异议',
      detail:
        '当挑战者明知庄家宣布结果正确却恶意提出异议时，经仲裁确认后，按正常庄家赢进行赔付，并额外扣除异议者冻结额的 10% 作为恶意异议的惩罚。',
    },
  ];

  const getResultColor = (result: string) => {
    if (result.includes('banker_loses')) return 'error';
    if (result.includes('void') || result.includes('作废')) return 'warning';
    return 'processing';
  };

  return (
    <PageContainer title="处罚规则">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <ProCard title="开战广场违规处罚标准" style={panelStyle}>
          <Table
            rowKey="violation"
            loading={penaltyRulesRequest.loading}
            pagination={false}
            dataSource={penaltyRulesRequest.data || []}
            columns={[
              { title: '违规行为', dataIndex: 'violation' },
              {
                title: '仲裁结果',
                dataIndex: 'result',
                width: 180,
                render: (value: string) => <Tag color={getResultColor(value)}>{value}</Tag>,
              },
              { title: '处罚措施', dataIndex: 'penalty' },
            ]}
          />
        </ProCard>

        {explanations.map((item) => (
          <ProCard
            key={item.title}
            style={{
              ...panelStyle,
              borderInlineStart: `4px solid ${item.color}`,
            }}
          >
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              {item.title}
            </Typography.Title>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {item.detail}
            </Typography.Paragraph>
          </ProCard>
        ))}
      </Space>
    </PageContainer>
  );
}
