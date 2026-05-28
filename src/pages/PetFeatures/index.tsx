import { ReloadOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProCard,
  ProFormSelect,
  ProFormText,
  ProTable,
  QueryFilter,
  type ProColumns,
} from '@ant-design/pro-components';
import {
  Alert,
  App,
  Button,
  Col,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { panelStyle } from '@/features/admin/shared';
import {
  useRequestPetFeatures,
} from '@/hooks/usePetAdminRequest';
import type {
  FeatureCatalogItem,
  FeatureScope,
} from '@/types/pet';
import { getLocalizedLabel } from '@/utils/petAdminAdapters';

interface FeatureFilterValues {
  keyword?: string;
  enabled?: 'all' | 'true' | 'false';
  scope?: 'all' | FeatureScope;
}

function toBooleanFilter(value: 'all' | 'true' | 'false') {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

export default function PetFeaturesPage() {
  const { message } = App.useApp();
  const [filters, setFilters] = useState<FeatureFilterValues>({
    enabled: 'all',
    scope: 'all',
  });

  const featureListRequest = useRequestPetFeatures();

  const loadFeatures = async (nextFilters = filters) => {
    try {
      await featureListRequest.run({
        current: 1,
        pageSize: 200,
        q: nextFilters.keyword?.trim() || undefined,
        enabled: toBooleanFilter(nextFilters.enabled ?? 'all'),
        scope: nextFilters.scope === 'all' ? undefined : nextFilters.scope,
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '特性模板加载失败');
    }
  };

  useEffect(() => {
    void loadFeatures();
    // Initial bootstrap only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const featureRecords = useMemo(
    () => featureListRequest.data?.data || [],
    [featureListRequest.data?.data],
  );

  const featureStats = useMemo(() => {
    return {
      total: featureRecords.length,
      petScoped: featureRecords.filter((item) => item.scope === 'PET').length,
      globalScoped: featureRecords.filter((item) => item.scope === 'GLOBAL').length,
    };
  }, [featureRecords]);

  const handleFilterSubmit = async (values: FeatureFilterValues) => {
    const nextFilters: FeatureFilterValues = {
      keyword: values.keyword,
      enabled: values.enabled ?? 'all',
      scope: values.scope ?? 'all',
    };
    setFilters(nextFilters);
    await loadFeatures(nextFilters);
  };

  const handleFilterReset = () => {
    const nextFilters: FeatureFilterValues = { enabled: 'all', scope: 'all' };
    setFilters(nextFilters);
    void loadFeatures(nextFilters);
  };

  const columns: ProColumns<FeatureCatalogItem>[] = [
    { title: 'feature_key', dataIndex: 'feature_key', width: 180 },
    {
      title: '名称',
      dataIndex: 'name',
      render: (_, record) => getLocalizedLabel(record.name),
    },
    {
      title: '作用域',
      dataIndex: 'scope',
      width: 120,
      render: (_, record) => <Tag color="processing">{record.scope}</Tag>,
    },
    {
      title: '生效时机',
      dataIndex: 'effective_event',
      width: 160,
      render: (_, record) => <Tag>{record.effective_event}</Tag>,
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 100,
      render: (_, record) => (
        <Tag color={record.enabled ? 'success' : 'default'}>{record.enabled ? '启用' : '停用'}</Tag>
      ),
    },
    {
      title: '更新时间',
      width: 180,
      render: (_, record) => record.metadata?.updated_at || '-',
    },
  ];

  return (
    <PageContainer title={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {featureListRequest.error instanceof Error ? (
          <Alert
            type="error"
            showIcon
            message="特性模板加载失败"
            description={featureListRequest.error.message}
          />
        ) : null}

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <ProCard style={panelStyle}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {featureStats.total}
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                模板总数
              </Typography.Paragraph>
            </ProCard>
          </Col>
          <Col xs={24} md={8}>
            <ProCard style={panelStyle}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {featureStats.petScoped}
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                PET 作用域模板
              </Typography.Paragraph>
            </ProCard>
          </Col>
          <Col xs={24} md={8}>
            <ProCard style={panelStyle}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {featureStats.globalScoped}
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                GLOBAL 作用域模板
              </Typography.Paragraph>
            </ProCard>
          </Col>
        </Row>

        <ProCard style={panelStyle}>
          <QueryFilter<FeatureFilterValues>
            defaultCollapsed={false}
            span={6}
            initialValues={{ enabled: 'all', scope: 'all' }}
            onFinish={handleFilterSubmit}
            onReset={handleFilterReset}
          >
            <ProFormText
              name="keyword"
              label="关键字"
              placeholder="搜索 feature_key / 名称"
            />
            <ProFormSelect
              name="enabled"
              label="状态"
              options={[
                { label: '全部状态', value: 'all' },
                { label: '启用', value: 'true' },
                { label: '停用', value: 'false' },
              ]}
            />
            <ProFormSelect
              name="scope"
              label="作用域"
              options={[
                { label: '全部作用域', value: 'all' },
                { label: 'PET', value: 'PET' },
                { label: 'GLOBAL', value: 'GLOBAL' },
              ]}
            />
          </QueryFilter>
        </ProCard>

        <ProTable<FeatureCatalogItem>
          headerTitle="特性模板列表"
          style={panelStyle}
          search={false}
          options={false}
          toolBarRender={() => [
            <Button key="refresh" icon={<ReloadOutlined />} onClick={() => void loadFeatures()}>
              刷新
            </Button>,
          ]}
          tableAlertRender={false}
          tableAlertOptionRender={false}
          rowKey="feature_key"
          loading={featureListRequest.loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
          }}
          dataSource={featureRecords}
          columns={columns}
        />
      </Space>
    </PageContainer>
  );
}
