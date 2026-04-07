import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  EnvironmentOutlined,
  HeartOutlined,
  MessageOutlined,
  PushpinOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Alert, App, Button, Input, Modal, Segmented, Space, Table, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { AdminTopic } from '@/data/admin_mock_data';
import { panelStyle } from '@/features/admin/shared';
import {
  useRequestAuditTopic,
  useRequestDeleteTopic,
  useRequestTopicBy,
  useRequestToggleTopicRecommend,
  useRequestToggleTopicSticky,
  useRequestTopics,
  useRequestUndeleteTopic,
  useRequestUserReports,
} from '@/hooks/useAdminRequest';

export default function CommunityPage() {
  const { message, modal } = App.useApp();
  const [tab, setTab] = useState<'all' | 'reported'>('all');
  const [restoreTopicId, setRestoreTopicId] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const topicsRequest = useRequestTopics();
  const topicDetailRequest = useRequestTopicBy();
  const reportsRequest = useRequestUserReports();

  const loadData = async () => {
    await Promise.all([
      topicsRequest.run({
        current: 1,
        pageSize: 200,
      }),
      reportsRequest.run({
        current: 1,
        pageSize: 200,
      }),
    ]);
  };

  useEffect(() => {
    void loadData();
    // Initial page hydration loads topics and reports together.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleStickyRequest = useRequestToggleTopicSticky();
  const toggleRecommendRequest = useRequestToggleTopicRecommend();
  const deleteTopicRequest = useRequestDeleteTopic();
  const auditTopicRequest = useRequestAuditTopic();
  const undeleteTopicRequest = useRequestUndeleteTopic();

  const reportMap = useMemo(() => {
    const next = new Map<number, string>();
    for (const report of reportsRequest.data?.data || []) {
      if (report.dataType === 'topic' || report.dataType === 'Topic' || !report.dataType) {
        next.set(report.dataId, report.reason);
      }
    }
    return next;
  }, [reportsRequest.data?.data]);

  const reportedTopics = useMemo(
    () =>
      (topicsRequest.data?.data || []).map((item) => ({
        ...item,
        reported: reportMap.has(Number(item.id)),
        reportReason: reportMap.get(Number(item.id)),
      })).filter((item) => item.reported),
    [reportMap, topicsRequest.data?.data],
  );
  const displayTopics: AdminTopic[] =
    tab === 'all'
      ? (topicsRequest.data?.data || []).map((item) => ({
          ...item,
          reported: reportMap.has(Number(item.id)),
          reportReason: reportMap.get(Number(item.id)),
        }))
      : reportedTopics;

  const openTopicDetail = async (topicId: number) => {
    try {
      await topicDetailRequest.run(topicId);
      setDetailModalOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '帖子详情加载失败');
    }
  };

  const handleRestoreTopic = async () => {
    const topicId = Number(restoreTopicId);
    if (!topicId) {
      message.error('请输入有效的帖子 ID');
      return;
    }

    try {
      await undeleteTopicRequest.run({ id: topicId });
      message.success('帖子恢复成功');
      setRestoreTopicId('');
      await loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '帖子恢复失败');
    }
  };

  return (
    <PageContainer title="社区管理">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div className="turtle-page-toolbar">
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {topicsRequest.error instanceof Error ? (
              <Alert
                type="error"
                showIcon
                message="帖子列表加载失败"
                description={topicsRequest.error.message}
              />
            ) : null}

            <Segmented
              options={[
                { label: '全部帖子', value: 'all' },
                { label: `举报待处理 (${reportedTopics.length})`, value: 'reported' },
              ]}
              value={tab}
              onChange={(value) => setTab(value as 'all' | 'reported')}
            />

            <ProCard style={panelStyle}>
              <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
                <Typography.Text strong>帖子恢复</Typography.Text>
                <Space wrap>
                  <Input
                    value={restoreTopicId}
                    onChange={(event) => setRestoreTopicId(event.target.value)}
                    placeholder="输入帖子 ID"
                    style={{ width: 180 }}
                  />
                  <Button
                    icon={<EditOutlined />}
                    loading={undeleteTopicRequest.loading}
                    onClick={() => void handleRestoreTopic()}
                  >
                    恢复帖子
                  </Button>
                </Space>
              </Space>
            </ProCard>
          </Space>
        </div>

        <ProCard style={panelStyle}>
          <Table
            rowKey="id"
            pagination={false}
            loading={topicsRequest.loading || reportsRequest.loading}
            dataSource={displayTopics}
            columns={[
              {
                title: '用户',
                dataIndex: 'user',
                width: 140,
                render: (_, record) => (
                  <Space>
                    <span style={{ fontSize: 24 }}>{record.user.avatar}</span>
                    <Typography.Text strong>{record.user.nickname}</Typography.Text>
                  </Space>
                ),
              },
              {
                title: '标题',
                dataIndex: 'title',
                width: 240,
                onCell: () => ({
                  style: {
                    minWidth: 200,
                  },
                }),
                render: (value: string, record) => (
                  <Space direction="vertical" size={4}>
                    <Space wrap>
                      {record.reported ? <Tag color="error">举报</Tag> : null}
                      {record.sticky ? <Tag color="processing">置顶</Tag> : null}
                      {record.recommend ? <Tag color="success">推荐</Tag> : null}
                      <Typography.Text strong>{value}</Typography.Text>
                    </Space>
                    {tab === 'reported' && record.reportReason ? (
                      <Typography.Text style={{ color: '#ff4d4f', fontSize: 12 }}>
                        {record.reportReason}
                      </Typography.Text>
                    ) : null}
                  </Space>
                ),
              },
              {
                title: '板块',
                dataIndex: ['node', 'name'],
                width: 120,
                render: (value: string) => <Tag>{value}</Tag>,
              },
              {
                title: '互动',
                dataIndex: 'viewCount',
                width: 200,
                render: (_, record) => (
                  <Space size={12}>
                    <Space size={4}>
                      <EyeOutlined />
                      <Typography.Text>{record.viewCount}</Typography.Text>
                    </Space>
                    <Space size={4}>
                      <MessageOutlined />
                      <Typography.Text>{record.commentCount}</Typography.Text>
                    </Space>
                    <Space size={4}>
                      <HeartOutlined />
                      <Typography.Text>{record.likeCount}</Typography.Text>
                    </Space>
                  </Space>
                ),
              },
              {
                title: 'IP',
                dataIndex: 'ipLocation',
                width: 120,
                render: (value: string) => (
                  <Space size={4}>
                    <EnvironmentOutlined />
                    <Typography.Text>{value}</Typography.Text>
                  </Space>
                ),
              },
              {
                title: '时间',
                dataIndex: 'createTime',
                width: 120,
              },
              {
                title: '操作',
                key: 'actions',
                width: 340,
                render: (_, record) => (
                  <Space wrap>
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      loading={topicDetailRequest.loading}
                      onClick={() => void openTopicDetail(Number(record.id))}
                    >
                      详情
                    </Button>
                    {record.reported ? (
                      <Button
                        size="small"
                        type="primary"
                        loading={auditTopicRequest.loading}
                        onClick={async () => {
                          try {
                            await auditTopicRequest.run({ id: Number(record.id) });
                            message.success('帖子审核已处理');
                            await loadData();
                          } catch (error) {
                            message.error(error instanceof Error ? error.message : '审核失败');
                          }
                        }}
                      >
                        审核
                      </Button>
                    ) : null}
                    <Button
                      size="small"
                      icon={<PushpinOutlined />}
                      loading={toggleStickyRequest.loading}
                      onClick={async () => {
                        try {
                          await toggleStickyRequest.run({
                            topicId: Number(record.id),
                            sticky: !record.sticky,
                          });
                          message.success(record.sticky ? '已取消置顶' : '已置顶');
                          await loadData();
                        } catch (error) {
                          message.error(error instanceof Error ? error.message : '置顶操作失败');
                        }
                      }}
                    >
                      {record.sticky ? '取消置顶' : '置顶'}
                    </Button>
                    <Button
                      size="small"
                      icon={<StarOutlined />}
                      loading={toggleRecommendRequest.loading}
                      onClick={async () => {
                        try {
                          await toggleRecommendRequest.run({
                            id: Number(record.id),
                            enabled: !record.recommend,
                          });
                          message.success(record.recommend ? '已取消推荐' : '已推荐');
                          await loadData();
                        } catch (error) {
                          message.error(error instanceof Error ? error.message : '推荐操作失败');
                        }
                      }}
                    >
                      {record.recommend ? '取消推荐' : '推荐'}
                    </Button>
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      loading={deleteTopicRequest.loading}
                      onClick={() => {
                        modal.confirm({
                          title: '确认删除帖子？',
                          content: record.title,
                          okText: '删除',
                          okButtonProps: { danger: true },
                          cancelText: '取消',
                          onOk: async () => {
                            try {
                              await deleteTopicRequest.run({ id: Number(record.id) });
                              message.success('帖子已删除');
                              await loadData();
                            } catch (error) {
                              message.error(error instanceof Error ? error.message : '删除失败');
                            }
                          },
                        });
                      }}
                    >
                      删除
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </ProCard>
      </Space>

      <Modal
        open={detailModalOpen}
        title="帖子详情"
        footer={null}
        onCancel={() => setDetailModalOpen(false)}
        destroyOnHidden
      >
        {topicDetailRequest.data ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {topicDetailRequest.data.title}
            </Typography.Title>
            <Typography.Text type="secondary">
              {topicDetailRequest.data.user.nickname} · {topicDetailRequest.data.createTime}
            </Typography.Text>
            <Space wrap>
              {topicDetailRequest.data.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              {topicDetailRequest.data.content || '暂无正文内容'}
            </Typography.Paragraph>
          </Space>
        ) : null}
      </Modal>
    </PageContainer>
  );
}
