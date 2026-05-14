import { EditOutlined, FireOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { TURTLE_API_BASE } from '@/api/api';
import { panelStyle } from '@/features/admin/shared';
import {
  useRequestAdminPkRounds,
  useRequestAdminPkSeasons,
  useRequestAdminPkTopics,
  useRequestRecalcAdminPkHeat,
  useRequestSaveAdminPkTopic,
  useRequestUpdateAdminPkTopicStatus,
} from '@/hooks/useAdminPkRequest';
import { useRequestUploadPetImage } from '@/hooks/usePetAdminRequest';
import type {
  AdminPkRecalcHeatPayload,
  AdminPkRoundListParams,
  AdminPkRoundRow,
  AdminPkSeasonListParams,
  AdminPkSeasonRow,
  AdminPkTopicListParams,
  AdminPkTopicRow,
  AdminPkTopicSavePayload,
  AdminPkTopicStatus,
} from '@/types/adminPk';

type PkTab = 'topics' | 'rounds' | 'seasons';

const topicStatusOptions = [
  { label: '启用', value: 'enabled' },
  { label: '停用', value: 'disabled' },
];

const roundPhaseOptions = [
  { label: 'betting', value: 'betting' },
  { label: 'locked', value: 'locked' },
  { label: 'cooldown', value: 'cooldown' },
  { label: 'settled', value: 'settled' },
];

const winnerOptions = [
  { label: 'A', value: 'A' },
  { label: 'B', value: 'B' },
  { label: 'draw', value: 'draw' },
];

const seasonStatusOptions = [
  { label: 'active', value: 'active' },
  { label: 'finished', value: 'finished' },
];

function resolveImageUrl(url: string | undefined) {
  if (!url) {
    return '';
  }

  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) {
    return url;
  }

  return `${TURTLE_API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getTopicStatusTag(status: AdminPkTopicStatus) {
  return status === 'enabled' ? <Tag color="success">启用</Tag> : <Tag color="default">停用</Tag>;
}

export default function PkPage() {
  const { message } = App.useApp();
  const access = useAccess() as { canManagePk?: boolean };
  const canManagePk = access.canManagePk === true;
  const [tab, setTab] = useState<PkTab>('topics');
  const [topicFilter, setTopicFilter] = useState<AdminPkTopicListParams>({ current: 1, pageSize: 100 });
  const [roundFilter, setRoundFilter] = useState<AdminPkRoundListParams>({ current: 1, pageSize: 100 });
  const [seasonFilter, setSeasonFilter] = useState<AdminPkSeasonListParams>({ current: 1, pageSize: 100 });
  const [topicEditorOpen, setTopicEditorOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<AdminPkTopicRow | null>(null);
  const [recalcOpen, setRecalcOpen] = useState(false);
  const [topicForm] = Form.useForm<AdminPkTopicSavePayload>();
  const [topicFilterForm] = Form.useForm<AdminPkTopicListParams>();
  const [roundFilterForm] = Form.useForm<AdminPkRoundListParams>();
  const [seasonFilterForm] = Form.useForm<AdminPkSeasonListParams>();
  const [recalcForm] = Form.useForm<AdminPkRecalcHeatPayload>();
  const topicCover = Form.useWatch('cover', topicForm) as string | undefined;

  const topicsRequest = useRequestAdminPkTopics();
  const roundsRequest = useRequestAdminPkRounds();
  const seasonsRequest = useRequestAdminPkSeasons();
  const saveTopicRequest = useRequestSaveAdminPkTopic();
  const updateTopicStatusRequest = useRequestUpdateAdminPkTopicStatus();
  const recalcHeatRequest = useRequestRecalcAdminPkHeat();
  const uploadImageRequest = useRequestUploadPetImage();

  const loadTopics = async (params = topicFilter) => {
    setTopicFilter(params);
    await topicsRequest.run(params);
  };

  const loadRounds = async (params = roundFilter) => {
    setRoundFilter(params);
    await roundsRequest.run(params);
  };

  const loadSeasons = async (params = seasonFilter) => {
    setSeasonFilter(params);
    await seasonsRequest.run(params);
  };

  const refreshAll = async () => {
    await Promise.all([loadTopics(), loadRounds(), loadSeasons()]);
  };

  useEffect(() => {
    void refreshAll();
    // Initial admin PK dashboard hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topicRows = useMemo(() => topicsRequest.data?.data || [], [topicsRequest.data?.data]);
  const roundRows = useMemo(() => roundsRequest.data?.data || [], [roundsRequest.data?.data]);
  const seasonRows = useMemo(() => seasonsRequest.data?.data || [], [seasonsRequest.data?.data]);

  const openCreateTopic = () => {
    setEditingTopic(null);
    topicForm.resetFields();
    topicForm.setFieldsValue({
      status: 'enabled',
      sort: 100,
    } as AdminPkTopicSavePayload);
    setTopicEditorOpen(true);
  };

  const openEditTopic = (row: AdminPkTopicRow) => {
    setEditingTopic(row);
    topicForm.setFieldsValue({
      id: row.topic.id,
      slug: row.topic.slug,
      title: row.topic.title,
      sideAName: row.topic.sideAName,
      sideBName: row.topic.sideBName,
      status: row.topic.status,
      sort: row.topic.sort,
      cover: row.topic.cover,
    });
    setTopicEditorOpen(true);
  };

  const handleSaveTopic = async () => {
    try {
      const values = await topicForm.validateFields();
      await saveTopicRequest.run(values);
      message.success(editingTopic ? 'PK话题已更新' : 'PK话题已创建');
      setTopicEditorOpen(false);
      setEditingTopic(null);
      topicForm.resetFields();
      await loadTopics();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleToggleTopicStatus = async (row: AdminPkTopicRow) => {
    const nextStatus: AdminPkTopicStatus = row.topic.status === 'enabled' ? 'disabled' : 'enabled';
    try {
      await updateTopicStatusRequest.run({
        topicId: row.topic.id,
        status: nextStatus,
      });
      message.success(nextStatus === 'enabled' ? 'PK话题已启用' : 'PK话题已停用');
      await loadTopics();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '状态更新失败');
    }
  };

  const handleUploadTopicCover = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.warning('请选择图片文件');
      return;
    }

    try {
      const result = await uploadImageRequest.run(file);
      if (!result.url) {
        throw new Error('上传结果缺少图片地址');
      }

      topicForm.setFieldsValue({ cover: result.url });
      message.success('封面上传成功');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '封面上传失败');
    }
  };

  const openRecalc = (payload?: Partial<AdminPkRecalcHeatPayload>) => {
    recalcForm.resetFields();
    recalcForm.setFieldsValue(payload);
    setRecalcOpen(true);
  };

  const handleRecalcHeat = async () => {
    try {
      const values = await recalcForm.validateFields();
      await recalcHeatRequest.run(values);
      message.success('热度重算已提交');
      setRecalcOpen(false);
      recalcForm.resetFields();
      await Promise.all([loadTopics(), loadRounds()]);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  return (
    <PageContainer
      title="对立PK管理"
      extra={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={() => void refreshAll()}>
          刷新
        </Button>,
        canManagePk ? (
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreateTopic}>
            新建话题
          </Button>
        ) : null,
      ].filter(Boolean)}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div className="turtle-page-toolbar">
          <Segmented
            block
            value={tab}
            onChange={(value) => setTab(value as PkTab)}
            options={[
              { label: `话题管理 (${topicsRequest.data?.total || 0})`, value: 'topics' },
              { label: `回合管理 (${roundsRequest.data?.total || 0})`, value: 'rounds' },
              { label: `赛季管理 (${seasonsRequest.data?.total || 0})`, value: 'seasons' },
            ]}
          />
        </div>

        {tab === 'topics' ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {topicsRequest.error ? (
              <Alert type="error" showIcon message="PK话题加载失败" description={topicsRequest.error.message} />
            ) : null}
            <ProCard title="筛选" style={panelStyle}>
              <Form
                form={topicFilterForm}
                layout="inline"
                onFinish={(values) => void loadTopics({ current: 1, pageSize: 100, ...values })}
              >
                <Form.Item name="q">
                  <Input allowClear placeholder="搜索标题 / slug / 阵营" style={{ width: 240 }} />
                </Form.Item>
                <Form.Item name="status">
                  <Select allowClear placeholder="状态" style={{ width: 140 }} options={topicStatusOptions} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    搜索
                  </Button>
                </Form.Item>
              </Form>
            </ProCard>
            <ProCard title="PK话题" style={panelStyle}>
              <Table<AdminPkTopicRow>
                rowKey={(row) => String(row.topic.id)}
                loading={topicsRequest.loading}
                pagination={false}
                dataSource={topicRows}
                columns={[
                  { title: 'ID', width: 72, render: (_, row) => row.topic.id },
                  {
                    title: '话题',
                    render: (_, row) => (
                      <Space direction="vertical" size={2}>
                        <Typography.Text strong>{row.topic.title || '-'}</Typography.Text>
                        <Typography.Text type="secondary">{row.topic.slug || '-'}</Typography.Text>
                      </Space>
                    ),
                  },
                  { title: '阵营A', width: 140, render: (_, row) => row.topic.sideAName || '-' },
                  { title: '阵营B', width: 140, render: (_, row) => row.topic.sideBName || '-' },
                  { title: '状态', width: 100, render: (_, row) => getTopicStatusTag(row.topic.status) },
                  { title: '当前回合', width: 120, render: (_, row) => row.round?.id || '-' },
                  { title: '当前赛季', width: 120, render: (_, row) => row.season?.id || '-' },
                  {
                    title: '战绩',
                    width: 160,
                    render: (_, row) => `${row.stats.totalRounds} 局 / A ${row.stats.winsA} : B ${row.stats.winsB}`,
                  },
                  {
                    title: '操作',
                    width: 260,
                    render: (_, row) => (
                      <Space wrap>
                        {canManagePk ? (
                          <Button size="small" icon={<EditOutlined />} onClick={() => openEditTopic(row)}>
                            编辑
                          </Button>
                        ) : null}
                        {canManagePk ? (
                          <Button size="small" onClick={() => void handleToggleTopicStatus(row)}>
                            {row.topic.status === 'enabled' ? '停用' : '启用'}
                          </Button>
                        ) : null}
                        {canManagePk && row.round?.id ? (
                          <Button
                            size="small"
                            icon={<FireOutlined />}
                            onClick={() => openRecalc({ topicId: row.topic.id, roundId: row.round?.id })}
                          >
                            重算热度
                          </Button>
                        ) : null}
                      </Space>
                    ),
                  },
                ]}
              />
            </ProCard>
          </Space>
        ) : null}

        {tab === 'rounds' ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {roundsRequest.error ? (
              <Alert type="error" showIcon message="PK回合加载失败" description={roundsRequest.error.message} />
            ) : null}
            <ProCard title="筛选" style={panelStyle}>
              <Form
                form={roundFilterForm}
                layout="inline"
                onFinish={(values) => void loadRounds({ current: 1, pageSize: 100, ...values })}
              >
                <Form.Item name="topicId">
                  <InputNumber min={1} placeholder="topicId" style={{ width: 140 }} />
                </Form.Item>
                <Form.Item name="phase">
                  <Select allowClear placeholder="阶段" style={{ width: 140 }} options={roundPhaseOptions} />
                </Form.Item>
                <Form.Item name="winner">
                  <Select allowClear placeholder="胜方" style={{ width: 120 }} options={winnerOptions} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    搜索
                  </Button>
                </Form.Item>
                {canManagePk ? (
                  <Form.Item>
                    <Button icon={<FireOutlined />} onClick={() => openRecalc()}>
                      重算热度
                    </Button>
                  </Form.Item>
                ) : null}
              </Form>
            </ProCard>
            <ProCard title="PK回合" style={panelStyle}>
              <Table<AdminPkRoundRow>
                rowKey={(row) => String(row.round.id)}
                loading={roundsRequest.loading}
                pagination={false}
                dataSource={roundRows}
                columns={[
                  { title: '回合ID', width: 90, render: (_, row) => row.round.id },
                  { title: '话题', render: (_, row) => row.topic?.title || `Topic ${row.round.topicId}` },
                  { title: '阶段', width: 120, render: (_, row) => <Tag>{row.round.phase || '-'}</Tag> },
                  { title: '胜方', width: 100, render: (_, row) => row.round.winner || '-' },
                  {
                    title: '热度',
                    width: 150,
                    render: (_, row) => `A ${row.round.heatA ?? 0} / B ${row.round.heatB ?? 0}`,
                  },
                  {
                    title: '奖池',
                    width: 150,
                    render: (_, row) => `A ${row.round.poolA ?? 0} / B ${row.round.poolB ?? 0}`,
                  },
                  {
                    title: '下注人数',
                    width: 150,
                    render: (_, row) => `A ${row.round.userCountA ?? 0} / B ${row.round.userCountB ?? 0}`,
                  },
                  { title: '结算时间', width: 180, render: (_, row) => row.round.settledAt || '-' },
                  {
                    title: '操作',
                    width: 120,
                    render: (_, row) =>
                      canManagePk ? (
                        <Button
                          size="small"
                          icon={<FireOutlined />}
                          onClick={() => openRecalc({ topicId: row.round.topicId, roundId: row.round.id })}
                        >
                          重算
                        </Button>
                      ) : null,
                  },
                ]}
              />
            </ProCard>
          </Space>
        ) : null}

        {tab === 'seasons' ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {seasonsRequest.error ? (
              <Alert type="error" showIcon message="PK赛季加载失败" description={seasonsRequest.error.message} />
            ) : null}
            <ProCard title="筛选" style={panelStyle}>
              <Form
                form={seasonFilterForm}
                layout="inline"
                onFinish={(values) => void loadSeasons({ current: 1, pageSize: 100, ...values })}
              >
                <Form.Item name="topicId">
                  <InputNumber min={1} placeholder="topicId" style={{ width: 140 }} />
                </Form.Item>
                <Form.Item name="status">
                  <Select allowClear placeholder="状态" style={{ width: 140 }} options={seasonStatusOptions} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    搜索
                  </Button>
                </Form.Item>
              </Form>
            </ProCard>
            <ProCard title="PK赛季" style={panelStyle}>
              <Table<AdminPkSeasonRow>
                rowKey={(row) => String(row.season.id)}
                loading={seasonsRequest.loading}
                pagination={false}
                dataSource={seasonRows}
                columns={[
                  { title: '赛季ID', width: 90, render: (_, row) => row.season.id },
                  { title: '话题', render: (_, row) => row.topic?.title || `Topic ${row.season.topicId}` },
                  { title: '赛季序号', width: 120, render: (_, row) => row.season.seasonNo || '-' },
                  { title: '状态', width: 120, render: (_, row) => <Tag>{row.season.status || '-'}</Tag> },
                  { title: '开始时间', width: 180, render: (_, row) => row.season.startTime || '-' },
                  { title: '结束时间', width: 180, render: (_, row) => row.season.endTime || '-' },
                ]}
              />
            </ProCard>
          </Space>
        ) : null}
      </Space>

      <Modal
        width={720}
        title={editingTopic ? '编辑PK话题' : '新建PK话题'}
        open={topicEditorOpen}
        onCancel={() => {
          setTopicEditorOpen(false);
          setEditingTopic(null);
          topicForm.resetFields();
        }}
        onOk={() => void handleSaveTopic()}
        okText="保存"
        cancelText="取消"
        confirmLoading={saveTopicRequest.loading}
        destroyOnClose
      >
        <Form form={topicForm} layout="vertical">
          <Form.Item name="id" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[
              { required: true, message: '请输入 slug' },
              { pattern: /^[a-z0-9-]+$/, message: '仅支持小写字母、数字和中划线' },
            ]}
          >
            <Input placeholder="pk-hero" />
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="足球GOAT之争" />
          </Form.Item>
          <Space size={16} style={{ width: '100%' }}>
            <Form.Item
              name="sideAName"
              label="阵营A"
              rules={[{ required: true, message: '请输入阵营A名称' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="梅西" />
            </Form.Item>
            <Form.Item
              name="sideBName"
              label="阵营B"
              rules={[{ required: true, message: '请输入阵营B名称' }]}
              style={{ flex: 1 }}
            >
              <Input placeholder="C罗" />
            </Form.Item>
          </Space>
          <Space size={16} style={{ width: '100%' }}>
            <Form.Item name="status" label="状态" rules={[{ required: true, message: '请选择状态' }]} style={{ flex: 1 }}>
              <Select options={topicStatusOptions} />
            </Form.Item>
            <Form.Item name="sort" label="排序" style={{ flex: 1 }}>
              <InputNumber min={0} precision={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>
          <Form.Item name="cover" hidden>
            <Input />
          </Form.Item>
          <Form.Item label="封面">
            <Upload
              accept="image/*"
              listType="picture-card"
              maxCount={1}
              fileList={
                topicCover
                  ? [
                      {
                        uid: 'topic-cover',
                        name: '封面',
                        status: 'done',
                        url: resolveImageUrl(topicCover),
                        thumbUrl: resolveImageUrl(topicCover),
                      },
                    ]
                  : []
              }
              onRemove={() => {
                topicForm.setFieldsValue({ cover: undefined });
              }}
              beforeUpload={(file) => {
                void handleUploadTopicCover(file);
                return false;
              }}
            >
              {topicCover ? null : (
                <button type="button" style={{ border: 0, background: 'none' }}>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>上传图片</div>
                </button>
              )}
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        width={560}
        title="管理员重算热度"
        open={recalcOpen}
        onCancel={() => {
          setRecalcOpen(false);
          recalcForm.resetFields();
        }}
        onOk={() => void handleRecalcHeat()}
        okText="提交"
        cancelText="取消"
        confirmLoading={recalcHeatRequest.loading}
        destroyOnClose
      >
        <Form form={recalcForm} layout="vertical">
          <Form.Item
            name="topicId"
            label="Topic ID"
            rules={[{ required: true, message: '请输入 topicId' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="roundId"
            label="Round ID"
            rules={[{ required: true, message: '请输入 roundId' }]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reason" label="原因">
            <Input.TextArea rows={3} placeholder="fix comment heat" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
