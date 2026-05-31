import { ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProCard,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProTable,
  QueryFilter,
  type ProColumns,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Alert, App, Button, Descriptions, Modal, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { fmtDate, panelStyle } from '@/features/admin/shared';
import {
  useRequestPredictTags,
  useRequestRefreshPredictTags,
} from '@/hooks/useAdminRequest';
import type { PredictTagListParams, PredictTagRecord } from '@/types/predictTag';

interface PredictTagFilterValues {
  q?: string;
  slugs?: string;
  sort?: 'marketCount' | 'updateTime';
  includeCounts?: boolean;
}

const DEFAULT_PAGE_SIZE = 20;

function formatUnixTime(ts?: number) {
  if (!ts) {
    return '-';
  }

  return fmtDate(ts < 1e12 ? ts * 1000 : ts);
}

export default function PredictTagsPage() {
  const { message } = App.useApp();
  const [filters, setFilters] = useState<PredictTagFilterValues>({
    includeCounts: true,
    sort: 'marketCount',
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: DEFAULT_PAGE_SIZE });
  const [detailRecord, setDetailRecord] = useState<PredictTagRecord | null>(null);

  const predictTagsRequest = useRequestPredictTags();
  const refreshTagsRequest = useRequestRefreshPredictTags();

  const buildQuery = (
    nextFilters: PredictTagFilterValues,
    nextPagination = pagination,
  ): PredictTagListParams => ({
    current: nextPagination.current,
    pageSize: nextPagination.pageSize,
    q: nextFilters.q?.trim() || undefined,
    slugs: nextFilters.slugs?.trim() || undefined,
    sort: nextFilters.sort,
    includeCounts: nextFilters.includeCounts ?? true,
  });

  const loadTags = async (
    nextFilters: PredictTagFilterValues = filters,
    nextPagination = pagination,
  ) => {
    try {
      await predictTagsRequest.run(buildQuery(nextFilters, nextPagination));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '标签列表加载失败');
    }
  };

  useEffect(() => {
    void loadTags(
      { includeCounts: true, sort: 'marketCount' },
      { current: 1, pageSize: DEFAULT_PAGE_SIZE },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tagRecords = useMemo(
    () => predictTagsRequest.data?.data || [],
    [predictTagsRequest.data?.data],
  );

  const handleFilterSubmit = async (values: PredictTagFilterValues) => {
    const nextFilters: PredictTagFilterValues = {
      q: values.q,
      slugs: values.slugs,
      sort: values.sort ?? 'marketCount',
      includeCounts: values.includeCounts ?? true,
    };
    const nextPagination = { ...pagination, current: 1 };

    setFilters(nextFilters);
    setPagination(nextPagination);
    await loadTags(nextFilters, nextPagination);
  };

  const handleFilterReset = () => {
    const nextFilters: PredictTagFilterValues = {
      includeCounts: true,
      sort: 'marketCount',
    };
    const nextPagination = { current: 1, pageSize: DEFAULT_PAGE_SIZE };

    setFilters(nextFilters);
    setPagination(nextPagination);
    void loadTags(nextFilters, nextPagination);
  };

  const handleTableChange = (page: number, pageSize: number) => {
    const nextPagination = { current: page, pageSize };
    setPagination(nextPagination);
    void loadTags(filters, nextPagination);
  };

  const handleRefreshMaterialized = async () => {
    try {
      await refreshTagsRequest.run();
      message.success('标签物化刷新完成');
      await loadTags(filters, pagination);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '标签物化刷新失败');
    }
  };

  const columns: ProColumns<PredictTagRecord>[] = [
    { title: 'ID', dataIndex: 'id', width: 80 },
    {
      title: 'Slug',
      dataIndex: 'slug',
      width: 140,
      render: (_, record) => <Typography.Text code>{record.slug || '-'}</Typography.Text>,
    },
    { title: '英文名', dataIndex: 'name', width: 160, ellipsis: true },
    {
      title: '中文名',
      dataIndex: 'cnName',
      width: 160,
      ellipsis: true,
      render: (_, record) => record.cnName || record.name || '-',
    },
    {
      title: '关联市场数',
      dataIndex: 'marketCount',
      width: 120,
      sorter: filters.includeCounts ? true : undefined,
      render: (_, record) =>
        filters.includeCounts ? (
          <Tag color={record.marketCount > 0 ? 'processing' : 'default'}>{record.marketCount}</Tag>
        ) : (
          '-'
        ),
    },
    {
      title: '最近出现',
      dataIndex: 'lastSeenAt',
      width: 140,
      render: (_, record) => formatUnixTime(record.lastSeenAt),
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      width: 140,
      render: (_, record) => formatUnixTime(record.updateTime),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 100,
      render: (_, record) => [
        <Button key="detail" type="link" size="small" onClick={() => setDetailRecord(record)}>
          详情
        </Button>,
      ],
    },
  ];

  const tagsError = predictTagsRequest.error instanceof Error ? predictTagsRequest.error : undefined;

  return (
    <PageContainer title="预测标签分类">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {tagsError ? (
          <Alert type="error" showIcon message="标签列表加载失败" description={tagsError.message} />
        ) : null}

        <ProCard style={panelStyle}>
          <QueryFilter<PredictTagFilterValues>
            defaultCollapsed={false}
            initialValues={{
              includeCounts: true,
              sort: 'marketCount',
            }}
            labelWidth="auto"
            span={6}
            onFinish={handleFilterSubmit}
            onReset={handleFilterReset}
          >
            <ProFormText name="q" label="关键字" placeholder="搜索 slug / name / cnName" />
            <ProFormText name="slugs" label="指定 Slug" placeholder="多个用英文逗号分隔" />
            <ProFormSelect
              name="sort"
              label="排序"
              options={[
                { label: '市场数（需开启统计）', value: 'marketCount' },
                { label: '更新时间', value: 'updateTime' },
              ]}
            />
            <ProFormSwitch name="includeCounts" label="关联统计" />
          </QueryFilter>
        </ProCard>

        <ProTable<PredictTagRecord>
          headerTitle="预测标签维表"
          style={panelStyle}
          search={false}
          options={false}
          toolBarRender={() => [
            <Button key="refresh" icon={<ReloadOutlined />} onClick={() => void loadTags()}>
              刷新
            </Button>,
            <Button
              key="materialize"
              icon={<SyncOutlined />}
              loading={refreshTagsRequest.loading}
              onClick={() => void handleRefreshMaterialized()}
            >
              刷新物化
            </Button>,
            <Button key="markets" onClick={() => history.push('/predict/markets')}>
              返回市场列表
            </Button>,
          ]}
          tableAlertRender={false}
          tableAlertOptionRender={false}
          rowKey="id"
          loading={predictTagsRequest.loading}
          dataSource={tagRecords}
          pagination={{
            current: predictTagsRequest.data?.page || pagination.current,
            pageSize: predictTagsRequest.data?.pageSize || pagination.pageSize,
            total: predictTagsRequest.data?.total || 0,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: (page, pageSize) => handleTableChange(page, pageSize),
          }}
          columns={columns}
        />
      </Space>

      <Modal
        open={Boolean(detailRecord)}
        title={detailRecord ? `标签详情 · ${detailRecord.cnName || detailRecord.name}` : '标签详情'}
        footer={null}
        onCancel={() => setDetailRecord(null)}
        destroyOnHidden
        width={560}
      >
        {detailRecord ? (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="ID">{detailRecord.id}</Descriptions.Item>
            <Descriptions.Item label="Slug">{detailRecord.slug || '-'}</Descriptions.Item>
            <Descriptions.Item label="英文名">{detailRecord.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="中文名">{detailRecord.cnName || '-'}</Descriptions.Item>
            <Descriptions.Item label="关联市场数">
              {filters.includeCounts ? detailRecord.marketCount : '未加载统计'}
            </Descriptions.Item>
            <Descriptions.Item label="最近出现">{formatUnixTime(detailRecord.lastSeenAt)}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{formatUnixTime(detailRecord.createTime)}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatUnixTime(detailRecord.updateTime)}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>
    </PageContainer>
  );
}
