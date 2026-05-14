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
  Empty,
  Form,
  Image,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Upload,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { TURTLE_API_BASE } from '@/api/api';
import { panelStyle } from '@/features/admin/shared';
import {
  useRequestDeletePetDefinition,
  useRequestPetDefinitions,
  useRequestPetFeatures,
  useRequestSavePetDefinition,
  useRequestUploadPetImage,
} from '@/hooks/usePetAdminRequest';
import { PET_RARITY_OPTIONS } from '@/types/pet';
import type {
  PetAbilities,
  PetAbilityParams,
  FeatureCatalogItem,
  LocalizedText,
  PetDefinition,
  PetDisplay,
  PetRarity,
} from '@/types/pet';

const rarityOptions = PET_RARITY_OPTIONS;

interface PetFormValues {
  pet_id: string;
  name?: LocalizedText;
  rarity: PetRarity;
  display?: PetDisplay;
  abilities?: string[];
  feature_keys?: string[];
}

interface PetFilterValues {
  keyword?: string;
  rarity?: PetRarity | 'all';
}

function resolveImageUrl(url: string | undefined) {
  if (!url) {
    return '';
  }

  if (/^(https?:)?\/\//.test(url) || url.startsWith('data:')) {
    return url;
  }

  return `${TURTLE_API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getLocaleText(value: LocalizedText | undefined, locale: string) {
  return value?.[locale] || '-';
}

function getPetImage(record: PetDefinition) {
  return record.display?.thumbnail || record.display?.icon || record.display?.cover;
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

function buildAbilitiesPayload(
  selectedAbilityKeys: string[] | undefined,
  selectedFeatureKeys: string[] | undefined,
  currentPet: PetDefinition | null | undefined,
  abilityParamMap: Map<string, PetAbilityParams>,
) {
  const selectedKeys = Array.from(new Set([...(selectedAbilityKeys || []), ...(selectedFeatureKeys || [])]));

  if (!selectedKeys.length) {
    return undefined;
  }

  const abilities = selectedKeys.reduce((result, featureKey) => {
    result[featureKey] = currentPet?.abilities?.[featureKey] ?? abilityParamMap.get(featureKey) ?? {};
    return result;
  }, {} as PetAbilities);

  return Object.keys(abilities).length ? abilities : undefined;
}

function buildPetPayload(
  values: PetFormValues,
  currentPet: PetDefinition | null | undefined,
  abilityParamMap: Map<string, PetAbilityParams>,
) {
  const base = compactObject({
    pet_id: values.pet_id,
    name: values.name,
    rarity: values.rarity,
    display: values.display,
  }) as Record<string, unknown> | undefined;

  return {
    pet_id: String(base?.pet_id ?? '').trim(),
    name: (base?.name as LocalizedText | undefined) ?? {},
    rarity: values.rarity,
    enabled: currentPet?.enabled ?? true,
    obtainable_by_egg: currentPet?.obtainable_by_egg ?? true,
    display: {
      ...currentPet?.display,
      ...(base?.display as PetDisplay | undefined),
    },
    description: currentPet?.description,
    pricing: currentPet?.pricing,
    abilities: buildAbilitiesPayload(values.abilities, values.feature_keys, currentPet, abilityParamMap),
  } satisfies Omit<PetDefinition, 'raw' | 'id'>;
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
  const petFeaturesRequest = useRequestPetFeatures();
  const savePetRequest = useRequestSavePetDefinition();
  const deletePetRequest = useRequestDeletePetDefinition();
  const uploadPetImageRequest = useRequestUploadPetImage();
  const displayThumbnail = Form.useWatch(['display', 'thumbnail'], petForm) as string | undefined;

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

  const loadPetFeatureOptions = async () => {
    try {
      await petFeaturesRequest.run({
        current: 1,
        pageSize: 200,
        scope: 'PET',
        enabled: true,
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '特性模板加载失败');
    }
  };

  useEffect(() => {
    void loadPets();
    void loadPetFeatureOptions();
    // Initial bootstrap only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const petRecords = useMemo(() => petListRequest.data?.data || [], [petListRequest.data?.data]);
  const featureOptions = useMemo(
    () => petFeaturesRequest.data?.data || [],
    [petFeaturesRequest.data?.data],
  );
  const abilityParamMap = useMemo(() => {
    const next = new Map<string, PetAbilityParams>();

    petRecords.forEach((pet) => {
      Object.entries(pet.abilities || {}).forEach(([featureKey, params]) => {
        if (!next.has(featureKey)) {
          next.set(featureKey, params);
        }
      });
    });

    return next;
  }, [petRecords]);
  const abilityOptions = useMemo(
    () => [...abilityParamMap.keys()].map((featureKey) => ({ label: featureKey, value: featureKey })),
    [abilityParamMap],
  );
  const featureTemplateOptions = useMemo(
    () =>
      featureOptions.map((item: FeatureCatalogItem) => ({
        label: `${item.feature_key} · ${getLocaleText(item.name, 'zh-CN')}`,
        value: item.feature_key,
      })),
    [featureOptions],
  );
  const getFeatureTemplateLabel = (featureKey: string) => {
    const feature = featureOptions.find((item) => item.feature_key === featureKey);

    if (!feature) {
      return featureKey;
    }

    return `${feature.feature_key} · ${getLocaleText(feature.name, 'zh-CN')}`;
  };

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
      render: (_, record) => {
        const imageUrl = resolveImageUrl(getPetImage(record));

        return imageUrl ? (
          <Image
            src={imageUrl}
            alt={getLocaleText(record.name, 'zh-CN')}
            width={64}
            height={64}
            style={{
              objectFit: 'cover',
              borderRadius: 8,
              border: '1px solid #eaecf0',
            }}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />
        );
      },
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
        const abilityKeys = Object.keys(record.abilities || {});

        if (!abilityKeys.length) {
          return '-';
        }

        return (
          <Space wrap size={[4, 4]}>
            {abilityKeys.map((featureKey) => (
              <Tag key={featureKey}>{featureKey}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: '特性模板',
      dataIndex: 'abilities',
      render: (_, record) => {
        const abilityKeys = Object.keys(record.abilities || {});

        if (!abilityKeys.length) {
          return '-';
        }

        return (
          <Space wrap size={[4, 4]}>
            {abilityKeys.map((featureKey) => (
              <Tag key={featureKey}>{getFeatureTemplateLabel(featureKey)}</Tag>
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
              onClick={() => openEditModal(record)}
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
      abilities: [],
      feature_keys: [],
    });
    setEditorOpen(true);
  };

  const openEditModal = (record: PetDefinition) => {
    setEditingPetId(record.id);
    setEditingPet(record);
    petForm.setFieldsValue({
      pet_id: record.pet_id,
      name: record.name,
      rarity: record.rarity,
      display: {
        ...record.display,
        thumbnail: getPetImage(record),
      },
      abilities: Object.keys(record.abilities || {}),
      feature_keys: Object.keys(record.abilities || {}),
    });
    setEditorOpen(true);
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
      const payload = buildPetPayload(values, editingPet, abilityParamMap);
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

  const handleUploadDisplayImage = async (field: keyof PetDisplay, file: File) => {
    if (!file.type.startsWith('image/')) {
      message.warning('请选择图片文件');
      return;
    }

    try {
      const result = await uploadPetImageRequest.run(file);
      if (!result.url) {
        throw new Error('上传结果缺少图片地址');
      }

      const currentDisplay = petForm.getFieldValue('display') as PetDisplay | undefined;
      petForm.setFieldsValue({
        display: {
          ...currentDisplay,
          [field]: result.url,
        },
      });
      message.success('图片上传成功');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '图片上传失败');
    }
  };

  const renderImageUpload = () => {
    const value = displayThumbnail;
    const imageUrl = resolveImageUrl(value);

    return (
      <Form.Item
        label="图片"
        required
      >
        <Form.Item
          name={['display', 'thumbnail']}
          rules={[{ required: true, message: '请上传图片' }]}
          noStyle
        >
          <Input type="hidden" />
        </Form.Item>
        <div>
          <Upload
            accept="image/*"
            listType="picture-card"
            maxCount={1}
            fileList={
              value
                ? [
                    {
                      uid: 'thumbnail',
                      name: '图片',
                      status: 'done',
                      url: imageUrl,
                      thumbUrl: imageUrl,
                    },
                  ]
                : []
            }
            onRemove={() => {
              const currentDisplay = petForm.getFieldValue('display') as PetDisplay | undefined;
              petForm.setFieldsValue({
                display: {
                  ...currentDisplay,
                  thumbnail: undefined,
                },
              });
            }}
            beforeUpload={(file) => {
              void handleUploadDisplayImage('thumbnail', file);
              return false;
            }}
          >
            {value ? null : (
              <button type="button" style={{ border: 0, background: 'none' }}>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>上传图片</div>
              </button>
            )}
          </Upload>
        </div>
      </Form.Item>
    );
  };

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
        destroyOnClose
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
                <Form.Item name="abilities" label="能力">
                  <Select
                    mode="multiple"
                    showSearch
                    allowClear
                    placeholder="选择能力"
                    optionFilterProp="label"
                    options={abilityOptions}
                  />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="feature_keys" label="特性模板">
                  <Select
                    mode="multiple"
                    showSearch
                    allowClear
                    placeholder="选择特性模板"
                    optionFilterProp="label"
                    loading={petFeaturesRequest.loading}
                    options={featureTemplateOptions}
                  />
                </Form.Item>
              </Col>
            </Row>
            {renderImageUpload()}
          </ProCard>
        </Form>
      </Modal>
    </PageContainer>
  );
}
