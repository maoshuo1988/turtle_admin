import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { panelStyle } from '@/features/admin/shared';
import {
  useRequestDeletePetAbility,
  useRequestDeletePetDefinition,
  useRequestPatchPetAbility,
  useRequestPetDefinitionBy,
  useRequestPetDefinitions,
  useRequestPetFeatures,
  useRequestPetKillSwitch,
  useRequestReplacePetAbilities,
  useRequestSavePetDefinition,
} from '@/hooks/usePetAdminRequest';
import type {
  FeatureCatalogItem,
  LocalizedText,
  PetAbilities,
  PetDefinition,
  PetDisplay,
  PetKillSwitchPayload,
  PetPricing,
  PetRarity,
} from '@/types/pet';
import { getLocalizedLabel } from '@/utils/petAdminAdapters';

const rarityOptions: PetRarity[] = ['C', 'B', 'A', 'S', 'SS', 'SSS'];
const killSwitchActions = [
  { label: '关闭开蛋池', value: 'disable_pool' },
  { label: '禁用单项能力', value: 'disable_feature' },
];

interface PetFormValues {
  pet_id: string;
  name?: Record<string, string>;
  rarity: PetRarity;
  enabled: boolean;
  obtainable_by_egg: boolean;
  display?: Record<string, string>;
  description?: Record<string, string>;
  pricing?: {
    egg_price?: number;
    egg_discount?: {
      type?: 'rate' | 'fixed';
      value?: number;
    };
  };
  abilities_json?: string;
}

interface AbilityFormValues {
  feature_key: string;
  enabled: boolean;
  params_json?: string;
}

interface AbilityRow {
  featureKey: string;
  params: Record<string, unknown>;
}

function formatJsonEditor(value: unknown) {
  if (!value || (typeof value === 'object' && !Object.keys(value as Record<string, unknown>).length)) {
    return '';
  }

  return JSON.stringify(value, null, 2);
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeAbilities(
  value: Record<string, unknown> | undefined,
  allowedFeatureKeys?: Set<string>,
) {
  if (!value) {
    return undefined;
  }

  const next: PetAbilities = {};

  Object.entries(value).forEach(([featureKey, params]) => {
    if (!isPlainObject(params)) {
      throw new Error(`abilities.${featureKey} 必须是 JSON 对象`);
    }

    if (allowedFeatureKeys && !allowedFeatureKeys.has(featureKey)) {
      throw new Error(`abilities.${featureKey} 不是已启用的特性模板`);
    }

    next[featureKey] = params;
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

function buildPetPayload(values: PetFormValues, allowedFeatureKeys?: Set<string>) {
  const abilities = normalizeAbilities(
    parseJsonField(values.abilities_json, 'abilities'),
    allowedFeatureKeys,
  );

  const base = compactObject({
    pet_id: values.pet_id,
    name: values.name,
    rarity: values.rarity,
    enabled: values.enabled,
    obtainable_by_egg: values.obtainable_by_egg,
    display: values.display,
    description: values.description,
    pricing: values.pricing,
    abilities,
  }) as Record<string, unknown> | undefined;

  return {
    pet_id: String(base?.pet_id ?? '').trim(),
    name: (base?.name as LocalizedText | undefined) ?? {},
    rarity: values.rarity,
    enabled: values.enabled,
    obtainable_by_egg: values.obtainable_by_egg,
    display: base?.display as PetDisplay | undefined,
    description: base?.description as LocalizedText | undefined,
    pricing: base?.pricing as PetPricing | undefined,
    abilities: base?.abilities as PetAbilities | undefined,
  } satisfies Omit<PetDefinition, 'raw'>;
}

export default function PetsPage() {
  const { message, modal } = App.useApp();
  const access = useAccess() as Record<string, boolean>;
  const canManagePets = access.canManagePets === true;
  const [petForm] = Form.useForm<PetFormValues>();
  const [killSwitchForm] = Form.useForm<PetKillSwitchPayload>();
  const [replaceAbilitiesForm] = Form.useForm<{ abilities_json?: string }>();
  const [abilityForm] = Form.useForm<AbilityFormValues>();
  const [keyword, setKeyword] = useState('');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'true' | 'false'>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | PetRarity>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [activePet, setActivePet] = useState<PetDefinition | null>(null);
  const [abilityEditorOpen, setAbilityEditorOpen] = useState(false);
  const [editingAbilityKey, setEditingAbilityKey] = useState<string | null>(null);

  const petListRequest = useRequestPetDefinitions();
  const petEditorDetailRequest = useRequestPetDefinitionBy();
  const petAbilityDetailRequest = useRequestPetDefinitionBy();
  const petFeaturesRequest = useRequestPetFeatures();
  const savePetRequest = useRequestSavePetDefinition();
  const deletePetRequest = useRequestDeletePetDefinition();
  const replaceAbilitiesRequest = useRequestReplacePetAbilities();
  const patchAbilityRequest = useRequestPatchPetAbility();
  const deleteAbilityRequest = useRequestDeletePetAbility();
  const killSwitchRequest = useRequestPetKillSwitch();

  const loadPets = async () => {
    try {
      await petListRequest.run({
        current: 1,
        pageSize: 200,
        keyword: keyword.trim() || undefined,
        enabled: toBooleanFilter(enabledFilter),
        rarity: rarityFilter === 'all' ? undefined : rarityFilter,
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
  const enabledFeatureKeys = useMemo(
    () => new Set(featureOptions.filter((item) => item.enabled).map((item) => item.feature_key)),
    [featureOptions],
  );
  const abilityFeatureKeys = featureOptions.length ? enabledFeatureKeys : undefined;

  const petStats = useMemo(() => {
    return {
      total: petRecords.length,
      enabled: petRecords.filter((item) => item.enabled).length,
      obtainable: petRecords.filter((item) => item.obtainable_by_egg).length,
    };
  }, [petRecords]);

  const abilityRows = useMemo<AbilityRow[]>(() => {
    if (!activePet?.abilities) {
      return [];
    }

    return Object.entries(activePet.abilities).map(([featureKey, params]) => ({
      featureKey,
      params,
    }));
  }, [activePet?.abilities]);

  const openCreateModal = () => {
    setEditingPetId(null);
    petForm.resetFields();
    petForm.setFieldsValue({
      rarity: 'C',
      enabled: true,
      obtainable_by_egg: true,
      abilities_json: '',
    });
    setEditorOpen(true);
  };

  const openEditModal = async (petId: string) => {
    try {
      const detail = await petEditorDetailRequest.run(petId);
      setEditingPetId(detail.pet_id);
      petForm.setFieldsValue({
        pet_id: detail.pet_id,
        name: detail.name,
        rarity: detail.rarity,
        enabled: detail.enabled,
        obtainable_by_egg: detail.obtainable_by_egg,
        display: detail.display,
        description: detail.description,
        pricing: detail.pricing,
        abilities_json: formatJsonEditor(detail.abilities),
      });
      setEditorOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '龟种详情加载失败');
    }
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingPetId(null);
    petForm.resetFields();
  };

  const handleSavePet = async () => {
    try {
      const values = await petForm.validateFields();
      const payload = buildPetPayload(values, abilityFeatureKeys);
      await savePetRequest.run(payload);
      message.success(editingPetId ? '龟种已更新' : '龟种已创建');
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
      title: `确认下架 ${record.pet_id} 吗？`,
      content: '接口约定支持软删，后端通常会将 enabled 置为 false。',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deletePetRequest.run(record.pet_id);
          message.success('龟种已删除');
          await loadPets();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '龟种删除失败');
        }
      },
    });
  };

  const openAbilitiesModal = async (petId: string) => {
    try {
      const detail = await petAbilityDetailRequest.run(petId);
      setActivePet(detail);
      replaceAbilitiesForm.setFieldsValue({
        abilities_json: formatJsonEditor(detail.abilities),
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '能力详情加载失败');
    }
  };

  const refreshActivePet = async () => {
    if (!activePet?.pet_id) {
      return;
    }

    try {
      const detail = await petAbilityDetailRequest.run(activePet.pet_id);
      setActivePet(detail);
      replaceAbilitiesForm.setFieldsValue({
        abilities_json: formatJsonEditor(detail.abilities),
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '能力详情刷新失败');
    }
  };

  const closeAbilitiesModal = () => {
    setActivePet(null);
    setAbilityEditorOpen(false);
    setEditingAbilityKey(null);
    replaceAbilitiesForm.resetFields();
    abilityForm.resetFields();
  };

  const handleReplaceAbilities = async () => {
    if (!activePet) {
      return;
    }

    try {
      const values = await replaceAbilitiesForm.validateFields();
      const abilities = normalizeAbilities(
        parseJsonField(values.abilities_json, 'abilities'),
        abilityFeatureKeys,
      );
      const updated = await replaceAbilitiesRequest.run({
        petId: activePet.pet_id,
        abilities: (abilities ?? {}) as PetAbilities,
      });
      setActivePet(updated);
      replaceAbilitiesForm.setFieldsValue({
        abilities_json: formatJsonEditor(updated.abilities),
      });
      message.success('abilities 已整体替换');
      await loadPets();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const openAbilityEditor = (row?: AbilityRow) => {
    if (!activePet) {
      return;
    }

    setEditingAbilityKey(row?.featureKey ?? null);
    abilityForm.resetFields();
    abilityForm.setFieldsValue({
      feature_key: row?.featureKey ?? undefined,
      enabled: true,
      params_json: formatJsonEditor(row?.params),
    });
    setAbilityEditorOpen(true);
  };

  const handleSaveAbility = async () => {
    if (!activePet) {
      return;
    }

    try {
      const values = await abilityForm.validateFields();
      const params = parseJsonField(values.params_json, '能力参数');
      if (values.enabled && !params) {
        throw new Error('启用时必须提供能力参数');
      }

      const updated = await patchAbilityRequest.run({
        petId: activePet.pet_id,
        featureKey: values.feature_key,
        enabled: values.enabled,
        params,
      });
      setActivePet(updated);
      replaceAbilitiesForm.setFieldsValue({
        abilities_json: formatJsonEditor(updated.abilities),
      });
      setAbilityEditorOpen(false);
      setEditingAbilityKey(null);
      abilityForm.resetFields();
      message.success('能力已保存');
      await loadPets();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleDeleteAbility = (featureKey: string) => {
    if (!activePet) {
      return;
    }

    modal.confirm({
      title: `确认移除能力 ${featureKey} 吗？`,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteAbilityRequest.run({
            petId: activePet.pet_id,
            featureKey,
          });
          message.success('能力已移除');
          await refreshActivePet();
          await loadPets();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '能力移除失败');
        }
      },
    });
  };

  const handleKillSwitch = async () => {
    try {
      const values = await killSwitchForm.validateFields();
      await killSwitchRequest.run(values);
      message.success('紧急开关已执行');
      killSwitchForm.resetFields();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  return (
    <PageContainer
      title="龟种管理"
      extra={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={() => void loadPets()}>
          刷新
        </Button>,
        canManagePets ? (
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新建龟种
          </Button>
        ) : null,
      ].filter(Boolean)}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {petListRequest.error instanceof Error ? (
          <Alert
            type="error"
            showIcon
            message="龟种列表加载失败"
            description={petListRequest.error.message}
          />
        ) : null}

        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <ProCard style={panelStyle}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {petStats.total}
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                当前龟种总数
              </Typography.Paragraph>
            </ProCard>
          </Col>
          <Col xs={24} md={8}>
            <ProCard style={panelStyle}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {petStats.enabled}
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                已启用龟种
              </Typography.Paragraph>
            </ProCard>
          </Col>
          <Col xs={24} md={8}>
            <ProCard style={panelStyle}>
              <Typography.Title level={4} style={{ margin: 0 }}>
                {petStats.obtainable}
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                可通过开蛋获得
              </Typography.Paragraph>
            </ProCard>
          </Col>
        </Row>

        <ProCard title="筛选" style={panelStyle}>
          <Space wrap>
            <Input
              allowClear
              style={{ width: 260 }}
              placeholder="搜索 pet_id / 名称 / 描述"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Select
              style={{ width: 160 }}
              value={enabledFilter}
              options={[
                { label: '全部状态', value: 'all' },
                { label: '已启用', value: 'true' },
                { label: '已停用', value: 'false' },
              ]}
              onChange={(value) => setEnabledFilter(value)}
            />
            <Select
              style={{ width: 160 }}
              value={rarityFilter}
              options={[
                { label: '全部稀有度', value: 'all' },
                ...rarityOptions.map((item) => ({ label: item, value: item })),
              ]}
              onChange={(value) => setRarityFilter(value)}
            />
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => void loadPets()}>
              应用筛选
            </Button>
          </Space>
        </ProCard>

        {canManagePets ? (
          <ProCard title="紧急止血开关" extra={<SafetyOutlined />} style={panelStyle}>
            <Form form={killSwitchForm} layout="inline" onFinish={() => void handleKillSwitch()}>
              <Form.Item
                name="action"
                rules={[{ required: true, message: '请选择动作' }]}
                initialValue="disable_pool"
              >
                <Select style={{ width: 180 }} options={killSwitchActions} />
              </Form.Item>
              <Form.Item
                name="scope"
                rules={[{ required: true, message: '请输入作用域' }]}
                initialValue="global"
              >
                <Input style={{ width: 180 }} placeholder="global / feature_key" />
              </Form.Item>
              <Form.Item name="reason" style={{ minWidth: 320 }}>
                <Input placeholder="触发原因，例如 emergency: exploit" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" danger htmlType="submit" loading={killSwitchRequest.loading}>
                  执行
                </Button>
              </Form.Item>
            </Form>
          </ProCard>
        ) : null}

        <ProCard title="龟种列表" style={panelStyle}>
          <Table
            rowKey="pet_id"
            loading={petListRequest.loading}
            pagination={false}
            dataSource={petRecords}
            columns={[
              { title: 'Pet ID', dataIndex: 'pet_id', width: 140 },
              {
                title: '名称',
                dataIndex: 'name',
                render: (value: LocalizedText) => getLocalizedLabel(value),
              },
              {
                title: '稀有度',
                dataIndex: 'rarity',
                width: 100,
                render: (value: PetRarity) => <Tag color="processing">{value}</Tag>,
              },
              {
                title: '启用',
                dataIndex: 'enabled',
                width: 100,
                render: (value: boolean) => (
                  <Tag color={value ? 'success' : 'default'}>{value ? '启用' : '停用'}</Tag>
                ),
              },
              {
                title: '开蛋获取',
                dataIndex: 'obtainable_by_egg',
                width: 120,
                render: (value: boolean) => (
                  <Tag color={value ? 'gold' : 'default'}>{value ? '可抽取' : '不可抽取'}</Tag>
                ),
              },
              {
                title: '默认价格',
                width: 120,
                render: (_, record) => record.pricing?.egg_price ?? '-',
              },
              {
                title: '能力数',
                width: 100,
                render: (_, record) => Object.keys(record.abilities || {}).length,
              },
              {
                title: '更新时间',
                width: 180,
                render: (_, record) => record.metadata?.updated_at || '-',
              },
              {
                title: '操作',
                width: 260,
                render: (_, record) => (
                  <Space wrap>
                    <Button
                      size="small"
                      icon={<SettingOutlined />}
                      onClick={() => void openAbilitiesModal(record.pet_id)}
                    >
                      abilities
                    </Button>
                    {canManagePets ? (
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        loading={petEditorDetailRequest.loading && editingPetId === record.pet_id}
                        onClick={() => void openEditModal(record.pet_id)}
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
            ]}
          />
        </ProCard>
      </Space>

      <Modal
        width={840}
        title={editingPetId ? `编辑龟种 ${editingPetId}` : '新建龟种'}
        open={editorOpen}
        onCancel={closeEditor}
        onOk={() => void handleSavePet()}
        okText="保存"
        confirmLoading={savePetRequest.loading}
        destroyOnClose
      >
        <Form form={petForm} layout="vertical">
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
              <Form.Item name={['name', 'en-US']} label="英文名称">
                <Input placeholder="Lava Turtle" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="enabled" label="启用展示" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="obtainable_by_egg" label="可开蛋获得" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['display', 'icon']} label="图标资源">
                <Input placeholder="pet:lava:icon_v2" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['display', 'cover']} label="封面资源">
                <Input placeholder="pet:lava:cover" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['display', 'thumbnail']} label="缩略图资源">
                <Input placeholder="pet:lava:thumb" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['description', 'zh-CN']} label="中文描述">
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name={['description', 'en-US']} label="英文描述">
                <Input.TextArea autoSize={{ minRows: 3, maxRows: 6 }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['pricing', 'egg_price']} label="开蛋价格">
                <InputNumber min={0} precision={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['pricing', 'egg_discount', 'type']} label="折扣类型">
                <Select
                  allowClear
                  options={[
                    { label: 'rate', value: 'rate' },
                    { label: 'fixed', value: 'fixed' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name={['pricing', 'egg_discount', 'value']} label="折扣值">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="abilities_json" label="abilities JSON">
            <Input.TextArea
              autoSize={{ minRows: 8, maxRows: 16 }}
              placeholder='{"spark_multiplier":{"base":1.3}}'
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        width={980}
        title={activePet ? `能力挂载 - ${activePet.pet_id}` : '能力挂载'}
        open={Boolean(activePet)}
        onCancel={closeAbilitiesModal}
        footer={null}
        destroyOnClose
      >
        {activePet ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message={`当前龟种：${getLocalizedLabel(activePet.name)} (${activePet.pet_id})`}
              description="abilities 按 featureKey -> params 存储，这里支持整体替换、单项编辑和删除。"
            />

            <ProCard
              title="单项能力"
              extra={
                canManagePets ? (
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => openAbilityEditor()}>
                    新增能力
                  </Button>
                ) : null
              }
              style={panelStyle}
            >
              <Table
                rowKey="featureKey"
                loading={petAbilityDetailRequest.loading || deleteAbilityRequest.loading}
                pagination={false}
                dataSource={abilityRows}
                columns={[
                  { title: 'featureKey', dataIndex: 'featureKey', width: 180 },
                  {
                    title: '参数',
                    dataIndex: 'params',
                    render: (value: Record<string, unknown>) => (
                      <Typography.Text code>{formatJsonEditor(value) || '{}'}</Typography.Text>
                    ),
                  },
                  {
                    title: '操作',
                    width: 180,
                    render: (_, record) => (
                      <Space wrap>
                        {canManagePets ? (
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => openAbilityEditor(record)}
                          >
                            编辑
                          </Button>
                        ) : null}
                        {canManagePets ? (
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleDeleteAbility(record.featureKey)}
                          >
                            删除
                          </Button>
                        ) : null}
                      </Space>
                    ),
                  },
                ]}
              />
            </ProCard>

            <ProCard
              title="整体替换 abilities"
              extra={
                canManagePets ? (
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={replaceAbilitiesRequest.loading}
                    onClick={() => void handleReplaceAbilities()}
                  >
                    保存整体配置
                  </Button>
                ) : null
              }
              style={panelStyle}
            >
              <Form form={replaceAbilitiesForm} layout="vertical">
                <Form.Item name="abilities_json" label="abilities JSON">
                  <Input.TextArea autoSize={{ minRows: 10, maxRows: 20 }} />
                </Form.Item>
              </Form>
            </ProCard>
          </Space>
        ) : null}
      </Modal>

      <Modal
        width={720}
        title={editingAbilityKey ? `编辑能力 ${editingAbilityKey}` : '新增能力'}
        open={abilityEditorOpen}
        onCancel={() => {
          setAbilityEditorOpen(false);
          setEditingAbilityKey(null);
          abilityForm.resetFields();
        }}
        onOk={() => void handleSaveAbility()}
        okText="保存"
        confirmLoading={patchAbilityRequest.loading}
        destroyOnClose
      >
        <Form form={abilityForm} layout="vertical">
          <Form.Item
            name="feature_key"
            label="特性模板"
            rules={[{ required: true, message: '请选择 featureKey' }]}
          >
            <Select
              showSearch
              disabled={Boolean(editingAbilityKey)}
              options={featureOptions.map((item: FeatureCatalogItem) => ({
                label: `${item.feature_key} · ${getLocalizedLabel(item.name)}`,
                value: item.feature_key,
              }))}
            />
          </Form.Item>
          <Form.Item name="enabled" label="是否启用" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, next) => prev.enabled !== next.enabled}
          >
            {({ getFieldValue }) =>
              getFieldValue('enabled') ? (
                <Form.Item
                  name="params_json"
                  label="能力参数 JSON"
                  rules={[{ required: true, message: '启用时必须提供参数' }]}
                >
                  <Input.TextArea autoSize={{ minRows: 8, maxRows: 16 }} />
                </Form.Item>
              ) : (
                <Form.Item name="params_json" label="能力参数 JSON">
                  <Input.TextArea autoSize={{ minRows: 8, maxRows: 16 }} />
                </Form.Item>
              )
            }
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
