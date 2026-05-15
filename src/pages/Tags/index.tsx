import { EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProCard,
  ProFormText,
  ProTable,
  QueryFilter,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess, useLocation } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Descriptions,
  Form,
  Input,
  Modal,
  Space,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { panelStyle } from '@/features/admin/shared';
import {
  useRequestTagById,
  useRequestTagCommentStats,
  useRequestTagCreate,
  useRequestTagList,
} from '@/hooks/useTagRequest';
import type { TagBrief, TagCommentStatRow, TagListParams } from '@/types/tag';

type TagPageMode = 'list' | 'stats';

interface TagFilterValues {
  keyword?: string;
}

const defaultLimit = 20;

function getMode(pathname: string): TagPageMode {
  return pathname.includes('/comment-stats') ? 'stats' : 'list';
}

export default function TagsPage() {
  const { message } = App.useApp();
  const location = useLocation();
  const access = useAccess() as { canManageCommunity?: boolean };
  const canManageTags = access.canManageCommunity === true;
  const mode = getMode(location.pathname);

  const [listPage, setListPage] = useState(1);
  const [statsPage, setStatsPage] = useState(1);
  const [listKeyword, setListKeyword] = useState('');
  const [statsKeyword, setStatsKeyword] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<{ name: string; description?: string }>();

  const tagListRequest = useRequestTagList();
  const tagStatsRequest = useRequestTagCommentStats();
  const tagDetailRequest = useRequestTagById();
  const tagCreateRequest = useRequestTagCreate();

  const listQuery = useMemo<TagListParams>(
    () => ({ page: listPage, limit: defaultLimit, keyword: listKeyword.trim() || undefined }),
    [listPage, listKeyword],
  );

  const statsQuery = useMemo<TagListParams>(
    () => ({ page: statsPage, limit: defaultLimit, keyword: statsKeyword.trim() || undefined }),
    [statsPage, statsKeyword],
  );

  const fetchTagList = async (params: TagListParams) => {
    await tagListRequest.run(params);
  };

  const fetchTagStats = async (params: TagListParams) => {
    await tagStatsRequest.run(params);
  };

  useEffect(() => {
    if (mode !== 'list') {
      return;
    }
    void fetchTagList(listQuery).catch(() => {
      /* 错误通过 tagListRequest.error 展示 */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, listPage]);

  useEffect(() => {
    if (mode !== 'stats') {
      return;
    }
    void fetchTagStats(statsQuery).catch(() => {
      /* 错误通过 tagStatsRequest.error 展示 */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, statsPage]);

  useEffect(() => {
    if (detailId === null) {
      return;
    }
    void tagDetailRequest.run(detailId).catch(() => {
      message.error('标签详情加载失败');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId]);

  const handleListSearch = async (values: TagFilterValues) => {
    const keyword = values.keyword?.trim() || '';
    setListKeyword(keyword);
    setListPage(1);
    await fetchTagList({ page: 1, limit: defaultLimit, keyword: keyword || undefined });
  };

  const handleListReset = () => {
    setListKeyword('');
    setListPage(1);
    void fetchTagList({ page: 1, limit: defaultLimit });
  };

  const handleStatsSearch = async (values: TagFilterValues) => {
    const keyword = values.keyword?.trim() || '';
    setStatsKeyword(keyword);
    setStatsPage(1);
    await fetchTagStats({ page: 1, limit: defaultLimit, keyword: keyword || undefined });
  };

  const handleStatsReset = () => {
    setStatsKeyword('');
    setStatsPage(1);
    void fetchTagStats({ page: 1, limit: defaultLimit });
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      if (!values.name?.trim()) {
        message.warning('请输入标签名称');
        return;
      }

      await tagCreateRequest.run({
        name: values.name.trim(),
        description: values.description?.trim(),
      });
      message.success('标签已创建');
      setCreateOpen(false);
      createForm.resetFields();
      await fetchTagList({ page: 1, limit: defaultLimit, keyword: listKeyword.trim() || undefined });
      setListPage(1);
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const listColumns: ProColumns<TagBrief>[] = [
    { title: 'ID', dataIndex: 'id', width: 96 },
    { title: '名称', dataIndex: 'name' },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      render: (_, record) => record.description || '-',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (_, record) => [
        <Button
          key="detail"
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setDetailId(record.id)}
        >
          详情
        </Button>,
      ],
    },
  ];

  const statsColumns: ProColumns<TagCommentStatRow>[] = [
    { title: '标签ID', dataIndex: 'tagId', width: 120 },
    { title: '标签名称', dataIndex: 'tagName' },
    { title: '评论总数', dataIndex: 'commentCount', width: 140 },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (_, record) => [
        <Button
          key="detail"
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => setDetailId(record.tagId)}
        >
          详情
        </Button>,
      ],
    },
  ];

  const renderListPage = () => {
    const listData = tagListRequest.data;

    return (
      <>
        {tagListRequest.error ? (
          <Alert type="error" showIcon message="标签列表加载失败" description={tagListRequest.error.message} />
        ) : null}

        <ProCard style={panelStyle}>
          <QueryFilter<TagFilterValues>
            defaultCollapsed={false}
            initialValues={{ keyword: listKeyword }}
            onFinish={handleListSearch}
            onReset={handleListReset}
          >
            <ProFormText name="keyword" label="关键字" placeholder="搜索标签名称" />
          </QueryFilter>
        </ProCard>

        <ProTable<TagBrief>
          headerTitle="标签列表"
          style={panelStyle}
          search={false}
          options={false}
          toolBarRender={() => [
            <Button key="refresh" icon={<ReloadOutlined />} onClick={() => void fetchTagList(listQuery)}>
              刷新
            </Button>,
            canManageTags ? (
              <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
                新建标签
              </Button>
            ) : null,
          ].filter(Boolean)}
          tableAlertRender={false}
          tableAlertOptionRender={false}
          rowKey="id"
          loading={tagListRequest.loading}
          dataSource={listData?.results || []}
          pagination={{
            current: listData?.page || listPage,
            pageSize: listData?.limit || defaultLimit,
            total: listData?.total || 0,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page) => setListPage(page),
          }}
          columns={listColumns}
        />
      </>
    );
  };

  const renderStatsPage = () => {
    const statsData = tagStatsRequest.data;

    return (
      <>
        {tagStatsRequest.error ? (
          <Alert type="error" showIcon message="评论统计加载失败" description={tagStatsRequest.error.message} />
        ) : null}

        <ProCard style={panelStyle}>
          <QueryFilter<TagFilterValues>
            defaultCollapsed={false}
            initialValues={{ keyword: statsKeyword }}
            onFinish={handleStatsSearch}
            onReset={handleStatsReset}
          >
            <ProFormText name="keyword" label="关键字" placeholder="搜索标签名称" />
          </QueryFilter>
        </ProCard>

        <ProTable<TagCommentStatRow>
          headerTitle="评论统计"
          style={panelStyle}
          search={false}
          options={false}
          toolBarRender={() => [
            <Button key="refresh" icon={<ReloadOutlined />} onClick={() => void fetchTagStats(statsQuery)}>
              刷新
            </Button>,
          ]}
          tableAlertRender={false}
          tableAlertOptionRender={false}
          rowKey="tagId"
          loading={tagStatsRequest.loading}
          dataSource={statsData?.results || []}
          pagination={{
            current: statsData?.page || statsPage,
            pageSize: statsData?.limit || defaultLimit,
            total: statsData?.total || 0,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page) => setStatsPage(page),
          }}
          columns={statsColumns}
        />
      </>
    );
  };

  return (
    <PageContainer title={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {mode === 'list' ? renderListPage() : renderStatsPage()}
      </Space>

      <Modal
        title="新建标签"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
        okText="创建"
        confirmLoading={tagCreateRequest.loading}
        destroyOnClose
        width={560}
      >
        {canManageTags ? (
          <Form form={createForm} layout="vertical" requiredMark={false}>
            <Form.Item
              name="name"
              label="名称"
              rules={[{ required: true, message: '请输入名称' }]}
            >
              <Input maxLength={32} placeholder="最多 32 字符" showCount />
            </Form.Item>
            <Form.Item name="description" label="描述（可选）">
              <Input.TextArea rows={4} maxLength={1024} placeholder="最多 1024 字符" showCount />
            </Form.Item>
          </Form>
        ) : (
          <Alert type="info" showIcon message="当前账号无社区管理权限，无法新建标签。" />
        )}
      </Modal>

      <Modal
        key={detailId ?? 'closed'}
        open={detailId !== null}
        title={`标签详情 #${detailId ?? ''}`}
        footer={null}
        onCancel={() => {
          setDetailId(null);
        }}
        destroyOnHidden
        width={560}
      >
        {tagDetailRequest.loading ? (
          <Typography.Text type="secondary">加载中...</Typography.Text>
        ) : tagDetailRequest.data ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{tagDetailRequest.data.id}</Descriptions.Item>
            <Descriptions.Item label="名称">{tagDetailRequest.data.name}</Descriptions.Item>
            <Descriptions.Item label="描述">{tagDetailRequest.data.description || '-'}</Descriptions.Item>
          </Descriptions>
        ) : tagDetailRequest.error ? (
          <Alert type="error" message={tagDetailRequest.error.message} />
        ) : null}
      </Modal>
    </PageContainer>
  );
}
