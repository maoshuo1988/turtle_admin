import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProCard,
  ProFormText,
  ProTable,
  QueryFilter,
  type ProColumns,
} from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import { Alert, App, Button, Form, Input, Modal, Space, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { panelStyle } from '@/features/admin/shared';
import {
  useRequestDeletePetAbility,
  useRequestPetDefinitions,
  useRequestPetFeatures,
  useRequestSavePetAbility,
} from '@/hooks/usePetAdminRequest';
import type { PetAbilityParams } from '@/types/pet';
import { getLocalizedLabel } from '@/utils/petAdminAdapters';

interface AbilityRow {
  rowKey: string;
  petDefinitionId: string;
  petId: string;
  petName: string;
  featureKey: string;
  ability: string;
  params: PetAbilityParams;
}

interface AbilityFormValues {
  feature_key: string;
  ability_name?: string;
  params_json: string;
}

interface AbilityFilterValues {
  keyword?: string;
}

function formatJsonEditor(value: unknown) {
  if (!value || (typeof value === 'object' && !Object.keys(value as Record<string, unknown>).length)) {
    return '';
  }

  return JSON.stringify(value, null, 2);
}

function parseJsonField(text: string | undefined, fieldLabel: string) {
  if (!text?.trim()) {
    return undefined;
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

function pickStringValue(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function getAbilityLabel(params: PetAbilityParams) {
  const directLabel = pickStringValue(params, ['ability', 'ability_name', 'abilityName', 'name', 'title', 'label']);
  if (directLabel) {
    return directLabel;
  }

  const display = params.display;
  if (display && typeof display === 'object' && !Array.isArray(display)) {
    return pickStringValue(display as Record<string, unknown>, ['ability', 'name', 'title', 'label']);
  }

  return '';
}

function mergeAbilityNameIntoParams(params: Record<string, unknown>, abilityName: string | undefined) {
  const normalizedAbilityName = abilityName?.trim();
  if (!normalizedAbilityName) {
    return params;
  }

  return {
    ...params,
    ability: normalizedAbilityName,
  };
}

export default function PetAbilitiesPage() {
  const { message, modal } = App.useApp();
  const access = useAccess() as { canManagePets?: boolean };
  const canManagePets = access.canManagePets === true;
  const [abilityForm] = Form.useForm<AbilityFormValues>();
  const [filters, setFilters] = useState<AbilityFilterValues>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AbilityRow | null>(null);

  const petListRequest = useRequestPetDefinitions();
  const featureListRequest = useRequestPetFeatures();
  const saveAbilityRequest = useRequestSavePetAbility();
  const deleteAbilityRequest = useRequestDeletePetAbility();

  const loadData = async () => {
    try {
      await Promise.all([
        petListRequest.run({ current: 1, pageSize: 500 }),
        featureListRequest.run({ current: 1, pageSize: 200, scope: 'PET', enabled: true }),
      ]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '能力列表加载失败');
    }
  };

  useEffect(() => {
    void loadData();
    // Initial bootstrap only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const petRecords = useMemo(() => petListRequest.data?.data || [], [petListRequest.data?.data]);
  const abilityRows = useMemo(() => {
    const rowMap = new Map<string, AbilityRow>();

    petRecords.forEach((pet) => {
      if (!pet.abilities) {
        return;
      }

      Object.entries(pet.abilities).forEach(([featureKey, params]) => {
        if (rowMap.has(featureKey)) {
          return;
        }

        rowMap.set(featureKey, {
          rowKey: featureKey,
          petDefinitionId: pet.id,
          petId: pet.pet_id,
          petName: getLocalizedLabel(pet.name),
          featureKey,
          ability: getAbilityLabel(params),
          params,
        });
      });
    });

    const rows = [...rowMap.values()];
    const normalizedKeyword = filters.keyword?.trim().toLowerCase();
    if (!normalizedKeyword) {
      return rows;
    }

    return rows.filter((row) =>
      [row.featureKey, row.ability, formatJsonEditor(row.params)]
        .join(' ')
        .toLowerCase()
        .includes(normalizedKeyword),
    );
  }, [filters.keyword, petRecords]);

  const handleFilterSubmit = async (values: AbilityFilterValues) => {
    setFilters({ keyword: values.keyword });
  };

  const handleFilterReset = () => {
    setFilters({});
  };

  const columns: ProColumns<AbilityRow>[] = [
    {
      title: 'featureKey',
      dataIndex: 'featureKey',
      width: 180,
      render: (_, record) => <Typography.Text code>{record.featureKey}</Typography.Text>,
    },
    {
      title: '能力',
      dataIndex: 'ability',
      width: 180,
      render: (_, record) => record.ability || null,
    },
    {
      title: '参数',
      dataIndex: 'params',
      render: (_, record) => (
        <Typography.Text code>{formatJsonEditor(record.params) || '{}'}</Typography.Text>
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      render: (_, record) => (
        <Space wrap>
          {canManagePets ? (
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              编辑
            </Button>
          ) : null}
          {canManagePets ? (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteAbility(record)}
            >
              删除
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const openCreateModal = () => {
    setEditingRow(null);
    abilityForm.resetFields();
    abilityForm.setFieldsValue({
      params_json: '{}',
    });
    setEditorOpen(true);
  };

  const openEditModal = (row: AbilityRow) => {
    setEditingRow(row);
    abilityForm.setFieldsValue({
      feature_key: row.featureKey,
      ability_name: row.ability || undefined,
      params_json: formatJsonEditor(row.params),
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingRow(null);
    abilityForm.resetFields();
  };

  const handleSaveAbility = async () => {
    try {
      const values = await abilityForm.validateFields();
      const params = parseJsonField(values.params_json, '能力参数');
      if (!params) {
        throw new Error('请提供能力参数');
      }

      const petDefinitionId = editingRow?.petDefinitionId ?? petRecords[0]?.id;
      if (!petDefinitionId) {
        throw new Error('暂无可挂载能力的龟种，请先添加龟种');
      }

      await saveAbilityRequest.run({
        petDefinitionId,
        featureKey: values.feature_key,
        params: mergeAbilityNameIntoParams(params, values.ability_name),
      });
      message.success(editingRow ? '能力已更新' : '能力已添加');
      closeEditor();
      await loadData();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleDeleteAbility = (row: AbilityRow) => {
    modal.confirm({
      title: `确认删除 ${row.petId} 的 ${row.featureKey} 吗？`,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteAbilityRequest.run({
            petDefinitionId: row.petDefinitionId,
            featureKey: row.featureKey,
          });
          message.success('能力已删除');
          await loadData();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '能力删除失败');
        }
      },
    });
  };

  return (
    <PageContainer>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {petListRequest.error instanceof Error || featureListRequest.error instanceof Error ? (
          <Alert
            type="error"
            showIcon
            message="能力列表加载失败"
            description={petListRequest.error?.message || featureListRequest.error?.message}
          />
        ) : null}

        <ProCard style={panelStyle}>
          <QueryFilter<AbilityFilterValues>
            defaultCollapsed={false}
            onFinish={handleFilterSubmit}
            onReset={handleFilterReset}
          >
            <ProFormText
              name="keyword"
              label="featureKey"
              placeholder="搜索 featureKey / 参数"
            />
          </QueryFilter>
        </ProCard>

        <ProTable<AbilityRow>
          headerTitle="能力列表"
          style={panelStyle}
          search={false}
          options={false}
          toolBarRender={() => [
            <Button key="refresh" icon={<ReloadOutlined />} onClick={() => void loadData()}>
              刷新
            </Button>,
            canManagePets ? (
              <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                添加能力
              </Button>
            ) : null,
          ].filter(Boolean)}
          tableAlertRender={false}
          tableAlertOptionRender={false}
          rowKey="rowKey"
          loading={
            petListRequest.loading ||
            featureListRequest.loading ||
            saveAbilityRequest.loading ||
            deleteAbilityRequest.loading
          }
          dataSource={abilityRows}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          columns={columns}
        />
      </Space>

      <Modal
        width={720}
        title={editingRow ? `编辑能力 ${editingRow.featureKey}` : '添加能力'}
        open={editorOpen}
        onCancel={closeEditor}
        onOk={() => void handleSaveAbility()}
        okText="保存"
        confirmLoading={saveAbilityRequest.loading}
        destroyOnClose
      >
        <Form form={abilityForm} layout="vertical">
          <Form.Item
            name="feature_key"
            label="featureKey"
            rules={[{ required: true, message: '请输入 featureKey' }]}
          >
            <Input disabled={Boolean(editingRow)} placeholder="spark_multiplier" />
          </Form.Item>
          <Form.Item name="ability_name" label="能力名称">
            <Input placeholder="加速收益" />
          </Form.Item>
          <Form.Item
            name="params_json"
            label="能力参数 JSON"
            extra="这里对应开蛋配置里龟种 abilities 的单项 params。"
            rules={[{ required: true, message: '请输入能力参数 JSON' }]}
          >
            <Input.TextArea autoSize={{ minRows: 8, maxRows: 16 }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
