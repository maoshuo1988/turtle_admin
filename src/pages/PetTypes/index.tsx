import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  ProCard,
  ProTable,
  ProFormSelect,
  ProFormText,
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
  Tag,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { PetDisplayAssetPreview } from '@/components/PetDisplayAssetPreview';
import { panelStyle } from '@/features/admin/shared';
import {
  useRequestDeletePetDefinition,
  useRequestPetAbilityOptions,
  useRequestPetDefinitions,
  useRequestSavePetDefinition,
} from '@/hooks/usePetAdminRequest';
import { PET_RARITY_OPTIONS, type AbilityOption, type LocalizedText, type PetDefinition, type PetDisplay, type PetRarity } from '@/types/pet';
import { applyUrlToDisplay, getPetDisplayPreviewUrl } from '@/utils/petAssetUrl';
import {
  buildAbilitiesFromOptionKeys,
  matchAbilityOptionKeys,
} from '@/utils/petAdminAdapters';

const rarityOptions = PET_RARITY_OPTIONS;

interface PetFormValues {
  pet_id: string;
  name?: LocalizedText;
  rarity: PetRarity;
  display_url?: string;
  display?: PetDisplay;
  ability_option_keys?: string[];
}

interface PetFilterValues {
  keyword?: string;
  rarity?: PetRarity | 'all';
}

function getLocaleText(value: LocalizedText | undefined, locale: string) {
  return value?.[locale] || '-';
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

function buildPetPayload(
  values: PetFormValues,
  currentPet: PetDefinition | null | undefined,
  abilityOptionMap: Map<string, AbilityOption>,
) {
  const base = compactObject({
    pet_id: values.pet_id,
    name: values.name,
    rarity: values.rarity,
  }) as Record<string, unknown> | undefined;

  const displayFromUrl = values.display_url?.trim()
    ? applyUrlToDisplay(values.display_url.trim())
    : {};

  return {
    pet_id: String(base?.pet_id ?? '').trim(),
    name: (base?.name as LocalizedText | undefined) ?? {},
    rarity: values.rarity,
    enabled: currentPet?.enabled ?? true,
    obtainable_by_egg: currentPet?.obtainable_by_egg ?? true,
    display: {
      ...currentPet?.display,
      ...displayFromUrl,
    },
    description: currentPet?.description,
    pricing: currentPet?.pricing,
    abilities: buildAbilitiesFromOptionKeys(values.ability_option_keys, abilityOptionMap),
  } satisfies Omit<PetDefinition, 'raw' | 'id'>;
}

function getAbilityLabelsForPet(
  pet: PetDefinition,
  abilityOptions: AbilityOption[],
  abilityOptionMap: Map<string, AbilityOption>,
) {
  const matchedKeys = matchAbilityOptionKeys(pet.abilities, abilityOptions);
  if (matchedKeys.length) {
    return matchedKeys.map((optionKey) => abilityOptionMap.get(optionKey)?.name || optionKey);
  }

  return Object.keys(pet.abilities || {});
}

export default function PetTypesPage() {
  const { message, modal } = App.useApp();
  const access = useAccess() as { canManagePets?: boolean };
  const canManagePets = access.canManagePets === true;
  const [petForm] = Form.useForm<PetFormValues>();
  const [filters, setFilters] = useState<PetFilterValues>({ rarity: 'all' });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [editingPet, setEditingPet] = useState<PetDefinition | null>(null);
  const petListRequest = useRequestPetDefinitions();
  const abilityOptionsRequest = useRequestPetAbilityOptions();
  const savePetRequest = useRequestSavePetDefinition();
  const deletePetRequest = useRequestDeletePetDefinition();

  const displayUrl = Form.useWatch('display_url', petForm) as string | undefined;
  const formRarity = Form.useWatch('rarity', petForm) as PetRarity | undefined;

  const loadPets = async (nextFilters = filters) => {
    try {
      await petListRequest.run({
        current: 1,
        pageSize: 200,
        keyword: nextFilters.keyword?.trim() || undefined,
        rarity: nextFilters.rarity === 'all' ? undefined : nextFilters.rarity,
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '龟种列表加载失败');
    }
  };

  const loadAbilityOptions = async (rarity?: PetRarity) => {
    try {
      await abilityOptionsRequest.run({
        selectableOnly: false,
        rarity,
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '能力预设加载失败');
    }
  };

  useEffect(() => {
    void loadPets();
    void loadAbilityOptions();
    // Initial bootstrap only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editorOpen || !formRarity) {
      return;
    }
    void loadAbilityOptions(formRarity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorOpen, formRarity]);

  const petRecords = useMemo(() => petListRequest.data?.data || [], [petListRequest.data?.data]);
  const abilityOptions = useMemo(
    () => abilityOptionsRequest.data?.data || [],
    [abilityOptionsRequest.data?.data],
  );
  const abilityOptionMap = useMemo(
    () => new Map(abilityOptions.map((item) => [item.optionKey, item])),
    [abilityOptions],
  );
  const abilitySelectOptions = useMemo(
    () =>
      abilityOptions.map((option) => ({
        label: `${option.name || option.optionKey} (${option.optionKey})`,
        value: option.optionKey,
        disabled: !option.selectable,
        title: option.selectable
          ? option.description || undefined
          : option.disabledReason || option.description || undefined,
      })),
    [abilityOptions],
  );

  const handleFilterSubmit = async (values: PetFilterValues) => {
    const nextFilters: PetFilterValues = {
      keyword: values.keyword,
      rarity: values.rarity ?? 'all',
    };
    setFilters(nextFilters);
    await loadPets(nextFilters);
  };

  const handleFilterReset = () => {
    const nextFilters: PetFilterValues = { rarity: 'all' };
    setFilters(nextFilters);
    void loadPets(nextFilters);
  };

  const columns: ProColumns<PetDefinition>[] = [
    {
      title: '龟图片',
      width: 120,
      search: false,
      render: (_, record) => (
        <PetDisplayAssetPreview
          src={getPetDisplayPreviewUrl(record.display)}
          alt={getLocaleText(record.name, 'zh-CN')}
          width={72}
          height={72}
        />
      ),
    },
    { title: 'Pet ID', dataIndex: 'pet_id', width: 180 },
    {
      title: '稀有度',
      dataIndex: 'rarity',
      width: 100,
      render: (_, record) => <Tag color="processing">{record.rarity}</Tag>,
    },
    {
      title: '中文名',
      dataIndex: 'name',
      render: (_, record) => getLocaleText(record.name, 'zh-CN'),
    },
    {
      title: '英文名',
      dataIndex: 'name',
      render: (_, record) => getLocaleText(record.name, 'en-US'),
    },
    {
      title: '能力',
      dataIndex: 'abilities',
      render: (_, record) => {
        const labels = getAbilityLabelsForPet(record, abilityOptions, abilityOptionMap);

        if (!labels.length) {
          return '-';
        }

        return (
          <Space wrap size={[4, 4]}>
            {labels.map((label) => (
              <Tag key={label}>{label}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      render: (_, record) => (
        <Space wrap>
          {canManagePets ? (
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => void openEditModal(record)}
            >
              编辑
            </Button>
          ) : null}
          {canManagePets ? (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              loading={deletePetRequest.loading}
              onClick={() => handleDeletePet(record)}
            >
              删除
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const openCreateModal = () => {
    setEditingPetId(null);
    setEditingPet(null);
    petForm.resetFields();
    petForm.setFieldsValue({
      rarity: 'C',
      ability_option_keys: [],
    });
    setEditorOpen(true);
    void loadAbilityOptions('C');
  };

  const openEditModal = async (record: PetDefinition) => {
    try {
      const result = await abilityOptionsRequest.run({
        selectableOnly: false,
        rarity: record.rarity,
      });
      setEditingPetId(record.id);
      setEditingPet(record);
      petForm.setFieldsValue({
        pet_id: record.pet_id,
        name: record.name,
        rarity: record.rarity,
        display_url: getPetDisplayPreviewUrl(record.display),
        ability_option_keys: matchAbilityOptionKeys(record.abilities, result.data),
      });
      setEditorOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '能力预设加载失败');
    }
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingPetId(null);
    setEditingPet(null);
    petForm.resetFields();
  };

  const handleSavePet = async () => {
    try {
      const values = await petForm.validateFields();
      const payload = buildPetPayload(values, editingPet, abilityOptionMap);
      await savePetRequest.run(payload);
      message.success(editingPetId ? '龟种已更新' : '龟种已添加');
      closeEditor();
      await loadPets();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleDeletePet = (record: PetDefinition) => {
    modal.confirm({
      title: `确认删除 ${record.pet_id} 吗？`,
      content: '删除操作不可撤销，请谨慎操作。',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deletePetRequest.run(record.id);
          message.success('龟种已删除');
          await loadPets();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '龟种删除失败');
        }
      },
    });
  };

  const renderDisplayAssetFields = () => (
    <Form.Item label="展示资源链接" required>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Form.Item
          name="display_url"
          rules={[{ required: true, message: '请输入资源链接' }]}
          noStyle
        >
          <Input
            placeholder="PNG/JPG 等显示图片；.json 显示骨骼动画（需同目录有同名 .atlas）"
            allowClear
          />
        </Form.Item>
        <PetDisplayAssetPreview src={displayUrl} alt="资源预览" width={120} height={120} />
      </Space>
    </Form.Item>
  );

  return (
    <PageContainer title={false}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {petListRequest.error instanceof Error ? (
          <Alert
            type="error"
            showIcon
            message="龟种列表加载失败"
            description={petListRequest.error.message}
          />
        ) : null}

        <ProCard style={panelStyle}>
          <QueryFilter<PetFilterValues>
            defaultCollapsed={false}
            initialValues={{ rarity: 'all' }}
            onFinish={handleFilterSubmit}
            onReset={handleFilterReset}
          >
            <ProFormText
              name="keyword"
              label="关键字"
              placeholder="搜索 Pet ID / 中文名 / 英文名"
            />
            <ProFormSelect
              name="rarity"
              label="稀有度"
              options={[
                { label: '全部稀有度', value: 'all' },
                ...rarityOptions.map((item) => ({ label: item, value: item })),
              ]}
            />
          </QueryFilter>
        </ProCard>

        <ProTable<PetDefinition>
          headerTitle="龟种列表"
          style={panelStyle}
          search={false}
          options={false}
          toolBarRender={() => [
            <Button key="refresh" icon={<ReloadOutlined />} onClick={() => void loadPets()}>
              刷新
            </Button>,
            canManagePets ? (
              <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
                添加龟种
              </Button>
            ) : null,
          ].filter(Boolean)}
          tableAlertRender={false}
          tableAlertOptionRender={false}
          rowKey="id"
          loading={petListRequest.loading}
          dataSource={petRecords}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
          }}
          columns={columns}
        />
      </Space>

      <Modal
        width={720}
        title={editingPetId ? `编辑龟种 ${petForm.getFieldValue('pet_id') || ''}` : '添加龟种'}
        open={editorOpen}
        onCancel={closeEditor}
        onOk={() => void handleSavePet()}
        okText="保存"
        confirmLoading={savePetRequest.loading}
        destroyOnHidden
      >
        <Form form={petForm} layout="vertical">
          <ProCard title="基础信息" size="small" style={panelStyle}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="pet_id"
                  label="Pet ID"
                  rules={[
                    { required: true, message: '请输入 pet_id' },
                    { pattern: /^[a-z0-9_]+$/, message: '仅支持小写字母、数字和下划线' },
                  ]}
                >
                  <Input disabled={Boolean(editingPetId)} placeholder="basic / lava / space" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="rarity"
                  label="稀有度"
                  rules={[{ required: true, message: '请选择稀有度' }]}
                >
                  <Select options={rarityOptions.map((item) => ({ label: item, value: item }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['name', 'zh-CN']}
                  label="中文名称"
                  rules={[{ required: true, message: '请输入中文名称' }]}
                >
                  <Input placeholder="火山龟" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['name', 'en-US']}
                  label="英文名称"
                  rules={[{ required: true, message: '请输入英文名称' }]}
                >
                  <Input placeholder="Lava Turtle" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  name="ability_option_keys"
                  label="能力"
                  extra="从能力预设列表选择，保存时会写入对应 abilities 参数"
                >
                  <Select
                    mode="multiple"
                    showSearch
                    allowClear
                    placeholder="选择能力预设"
                    optionFilterProp="label"
                    loading={abilityOptionsRequest.loading}
                    options={abilitySelectOptions}
                  />
                </Form.Item>
              </Col>
            </Row>
            {renderDisplayAssetFields()}
          </ProCard>
        </Form>
      </Modal>
    </PageContainer>
  );
}
