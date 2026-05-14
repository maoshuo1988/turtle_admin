import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProCard,
  ProFormSelect,
  ProFormText,
  ProTable,
  QueryFilter,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { panelStyle } from '@/features/admin/shared';
import {
  useRequestDeletePetFeature,
  useRequestPetFeatureBy,
  useRequestPetFeatures,
  useRequestSavePetFeature,
} from '@/hooks/usePetAdminRequest';
import type {
  FeatureCatalogItem,
  FeatureEffectiveEvent,
  FeatureScope,
  LocalizedText,
} from '@/types/pet';
import { getLocalizedLabel } from '@/utils/petAdminAdapters';

const featureEventOptions: FeatureEffectiveEvent[] = [
  'DAILY_SIGNIN',
  'EGG_PURCHASE',
  'EGG_RESOLVE',
  'BET_SETTLE',
  'CHAT_STAMINA',
  'MINIGAME',
];

interface FeatureFormValues {
  feature_key: string;
  name?: Record<string, string>;
  scope: FeatureScope;
  effective_event: FeatureEffectiveEvent;
  enabled: boolean;
  params_schema_json: string;
}

interface FeatureFilterValues {
  keyword?: string;
  enabled?: 'all' | 'true' | 'false';
  scope?: 'all' | FeatureScope;
}

function parseJsonObject(text: string | undefined, fieldLabel: string) {
  if (!text?.trim()) {
    throw new Error(`${fieldLabel} 不能为空`);
  }

  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error();
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(`${fieldLabel} 需要是合法的 JSON 对象`);
  }
}

function formatJsonEditor(value: unknown) {
  return value ? JSON.stringify(value, null, 2) : '';
}

function compactObject(value: Record<string, unknown> | undefined) {
  if (!value) {
    return undefined;
  }

  const next: Record<string, unknown> = {};

  Object.entries(value).forEach(([key, current]) => {
    if (typeof current === 'string') {
      const trimmed = current.trim();
      if (trimmed) {
        next[key] = trimmed;
      }
      return;
    }

    if (current && typeof current === 'object' && !Array.isArray(current)) {
      const nested = compactObject(current as Record<string, unknown>);
      if (nested) {
        next[key] = nested;
      }
      return;
    }

    if (current !== undefined && current !== null && current !== '') {
      next[key] = current;
    }
  });

  return Object.keys(next).length ? next : undefined;
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
  const { message, modal } = App.useApp();
  const access = useAccess() as { canManagePetFeatures?: boolean };
  const canManagePetFeatures = access.canManagePetFeatures === true;
  const [featureForm] = Form.useForm<FeatureFormValues>();
  const [filters, setFilters] = useState<FeatureFilterValues>({
    enabled: 'all',
    scope: 'all',
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFeatureKey, setEditingFeatureKey] = useState<string | null>(null);

  const featureListRequest = useRequestPetFeatures();
  const featureDetailRequest = useRequestPetFeatureBy();
  const saveFeatureRequest = useRequestSavePetFeature();
  const deleteFeatureRequest = useRequestDeletePetFeature();

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

  const openCreateModal = () => {
    setEditingFeatureKey(null);
    featureForm.resetFields();
    featureForm.setFieldsValue({
      scope: 'PET',
      effective_event: 'DAILY_SIGNIN',
      enabled: true,
      params_schema_json: JSON.stringify(
        {
          type: 'object',
          required: [],
          properties: {},
        },
        null,
        2,
      ),
    });
    setEditorOpen(true);
  };

  const openEditModal = async (featureKey: string) => {
    try {
      const detail = await featureDetailRequest.run(featureKey);
      setEditingFeatureKey(detail.feature_key);
      featureForm.setFieldsValue({
        feature_key: detail.feature_key,
        name: detail.name,
        scope: detail.scope,
        effective_event: detail.effective_event,
        enabled: detail.enabled,
        params_schema_json: formatJsonEditor(detail.params_schema),
      });
      setEditorOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '特性详情加载失败');
    }
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingFeatureKey(null);
    featureForm.resetFields();
  };

  const handleSaveFeature = async () => {
    try {
      const values = await featureForm.validateFields();
      const names = compactObject(values.name as Record<string, unknown> | undefined);
      await saveFeatureRequest.run({
        feature_key: values.feature_key.trim(),
        name: (names ?? {}) as LocalizedText,
        scope: values.scope,
        effective_event: values.effective_event,
        enabled: values.enabled,
        params_schema: parseJsonObject(values.params_schema_json, '参数 Schema'),
      });
      message.success(editingFeatureKey ? '特性模板已更新' : '特性模板已创建');
      closeEditor();
      await loadFeatures();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleDeleteFeature = (record: FeatureCatalogItem) => {
    modal.confirm({
      title: `确认删除模板 ${record.feature_key} 吗？`,
      content: '接口约定建议软删，后端通常会将 enabled 置为 false。',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteFeatureRequest.run(record.feature_key);
          message.success('特性模板已删除');
          await loadFeatures();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '特性模板删除失败');
        }
      },
    });
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
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      render: (_, record) => (
        <Space wrap>
          {canManagePetFeatures ? (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => void openEditModal(record.feature_key)}
            >
              编辑
            </Button>
          ) : null}
          {canManagePetFeatures ? (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteFeature(record)}
            >
              删除
            </Button>
          ) : null}
        </Space>
      ),
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
            canManagePetFeatures ? (
              <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                新建模板
              </Button>
            ) : null,
          ].filter(Boolean)}
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

      <Modal
        width={840}
        title={editingFeatureKey ? `编辑模板 ${editingFeatureKey}` : '新建模板'}
        open={editorOpen}
        onCancel={closeEditor}
        onOk={() => void handleSaveFeature()}
        okText="保存"
        confirmLoading={saveFeatureRequest.loading}
        destroyOnClose
      >
        <Form form={featureForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="feature_key"
                label="feature_key"
                rules={[
                  { required: true, message: '请输入 feature_key' },
                  { pattern: /^[a-z0-9_]+$/, message: '仅支持小写字母、数字和下划线' },
                ]}
              >
                <Input disabled={Boolean(editingFeatureKey)} placeholder="spark_multiplier" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="scope"
                label="作用域"
                rules={[{ required: true, message: '请选择作用域' }]}
              >
                <Select
                  options={[
                    { label: 'PET', value: 'PET' },
                    { label: 'GLOBAL', value: 'GLOBAL' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['name', 'zh-CN']}
                label="中文名称"
                rules={[{ required: true, message: '请输入中文名称' }]}
              >
                <Input placeholder="每日登录加成" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['name', 'en-US']} label="英文名称">
                <Input placeholder="Signin Bonus" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="effective_event"
                label="生效时机"
                rules={[{ required: true, message: '请选择生效时机' }]}
              >
                <Select options={featureEventOptions.map((item) => ({ label: item, value: item }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="enabled" label="允许运营使用" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="params_schema_json"
            label="参数 Schema JSON"
            rules={[{ required: true, message: '请输入参数 Schema JSON' }]}
          >
            <Input.TextArea autoSize={{ minRows: 12, maxRows: 20 }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
