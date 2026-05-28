import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyOutlined,
  SaveOutlined,
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
import { PetDisplayAssetPreview } from '@/components/PetDisplayAssetPreview';
import { panelStyle } from '@/features/admin/shared';
import PetEggSettingModal, {
  type EggSettingFormValues,
  type EggSettingMode,
} from './components/PetEggSettingModal';
import {
  useRequestDeletePetAbility,
  useRequestPetDefinitions,
  useRequestPetFeatures,
  useRequestPetKillSwitch,
  useRequestReplacePetAbilities,
  useRequestSavePetAbility,
  useRequestSavePetDefinition,
} from '@/hooks/usePetAdminRequest';
import { PET_RARITY_OPTIONS } from '@/types/pet';
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
import { getPetDisplayPreviewUrl } from '@/utils/petAssetUrl';

const rarityOptions = PET_RARITY_OPTIONS;
const killSwitchActions = [
  { label: '关闭开蛋池', value: 'disable_pool' },
  { label: '禁用单项能力', value: 'disable_feature' },
];

interface PetFormValues {
  pet_id: string;
  name?: LocalizedText;
  rarity: PetRarity;
  enabled: boolean;
  obtainable_by_egg: boolean;
  feature_keys?: string[];
  display?: PetDisplay;
  description?: LocalizedText;
  pricing?: PetPricing;
  abilities_json?: string;
}

interface AbilityFormValues {
  feature_key: string;
  params_json: string;
}

interface AbilityRow {
  featureKey: string;
  params: Record<string, unknown>;
}

interface PetFilterValues {
  keyword?: string;
  enabled?: 'all' | 'true' | 'false';
  rarity?: 'all' | PetRarity;
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

function getAbilityFeatureKeys(abilities: PetAbilities | undefined) {
  return Object.keys(abilities || {});
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
  } satisfies Omit<PetDefinition, 'raw' | 'id'>;
}

export default function PetsPage() {
  const { message, modal } = App.useApp();
  const access = useAccess() as { canManagePets?: boolean };
  const canManagePets = access.canManagePets === true;
  const [petForm] = Form.useForm<PetFormValues>();
  const [eggSettingForm] = Form.useForm<EggSettingFormValues>();
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
  const [eggSettingOpen, setEggSettingOpen] = useState(false);
  const [eggSettingPetId, setEggSettingPetId] = useState<string | undefined>();
  const [eggSettingMode, setEggSettingMode] = useState<EggSettingMode>('create');

  const petListRequest = useRequestPetDefinitions();
  const petFeaturesRequest = useRequestPetFeatures();
  const savePetRequest = useRequestSavePetDefinition();
  const replaceAbilitiesRequest = useRequestReplacePetAbilities();
  const saveAbilityRequest = useRequestSavePetAbility();
  const deleteAbilityRequest = useRequestDeletePetAbility();
  const killSwitchRequest = useRequestPetKillSwitch();
  const displayIcon = Form.useWatch(['display', 'icon'], petForm) as string | undefined;
  const displayCover = Form.useWatch(['display', 'cover'], petForm) as string | undefined;
  const displayThumbnail = Form.useWatch(['display', 'thumbnail'], petForm) as string | undefined;

  const loadPets = async (filters?: PetFilterValues) => {
    const nextKeyword = filters?.keyword ?? keyword;
    const nextEnabledFilter = filters?.enabled ?? enabledFilter;
    const nextRarityFilter = filters?.rarity ?? rarityFilter;

    try {
      await petListRequest.run({
        current: 1,
        pageSize: 200,
        keyword: nextKeyword.trim() || undefined,
        enabled: toBooleanFilter(nextEnabledFilter),
        rarity: nextRarityFilter === 'all' ? undefined : nextRarityFilter,
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '龟种列表加载失败');
    }
  };

  const handleFilterSubmit = async (values: PetFilterValues) => {
    const nextFilters: PetFilterValues = {
      keyword: values.keyword ?? '',
      enabled: values.enabled ?? 'all',
      rarity: values.rarity ?? 'all',
    };

    setKeyword(nextFilters.keyword ?? '');
    setEnabledFilter(nextFilters.enabled ?? 'all');
    setRarityFilter(nextFilters.rarity ?? 'all');
    await loadPets(nextFilters);
  };

  const handleFilterReset = async () => {
    const nextFilters: PetFilterValues = {
      keyword: '',
      enabled: 'all',
      rarity: 'all',
    };

    setKeyword('');
    setEnabledFilter('all');
    setRarityFilter('all');
    await loadPets(nextFilters);
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
  const eggSettingPet = useMemo(
    () => petRecords.find((item) => item.id === eggSettingPetId),
    [eggSettingPetId, petRecords],
  );

  const closeEggSettingModal = () => {
    setEggSettingOpen(false);
    setEggSettingPetId(undefined);
    setEggSettingMode('create');
    eggSettingForm.resetFields();
  };

  const fillEggSettingForm = (record: PetDefinition, mode: EggSettingMode) => {
    setEggSettingMode(mode);
    setEggSettingPetId(record.id);
    eggSettingForm.resetFields();
    eggSettingForm.setFieldsValue({
      enabled: record.enabled,
      obtainable_by_egg: record.obtainable_by_egg,
    });
    setEggSettingOpen(true);
  };

  const handleEggSettingPetChange = (petDefinitionId: string | undefined) => {
    setEggSettingPetId(petDefinitionId);
    const selectedPet = petRecords.find((item) => item.id === petDefinitionId);

    if (!selectedPet) {
      eggSettingForm.resetFields();
      return;
    }

    eggSettingForm.setFieldsValue({
      enabled: selectedPet.enabled,
      obtainable_by_egg: selectedPet.obtainable_by_egg,
    });
  };

  const openEditModal = (record: PetDefinition) => {
    fillEggSettingForm(record, 'edit');
  };

  const openDetailModal = (record: PetDefinition) => {
    fillEggSettingForm(record, 'detail');
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

  const handleSaveEggSetting = async () => {
    if (!eggSettingPet) {
      message.warning('请先选择龟');
      return;
    }

    try {
      const values = await eggSettingForm.validateFields(['enabled', 'obtainable_by_egg']);
      await savePetRequest.run({
        pet_id: eggSettingPet.pet_id,
        name: eggSettingPet.name,
        rarity: eggSettingPet.rarity,
        enabled: values.enabled ?? false,
        obtainable_by_egg: values.obtainable_by_egg ?? false,
        display: eggSettingPet.display,
        description: eggSettingPet.description,
        pricing: eggSettingPet.pricing,
        abilities: eggSettingPet.abilities,
      });
      message.success(eggSettingMode === 'edit' ? '开蛋设置已更新' : '开蛋设置已新增');
      closeEggSettingModal();
      await loadPets();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handlePetFeatureTemplatesChange = (featureKeys: string[]) => {
    try {
      const currentAbilities = parseJsonField(
        petForm.getFieldValue('abilities_json'),
        'abilities',
      ) as PetAbilities | undefined;
      const nextAbilities = featureKeys.reduce((result, featureKey) => {
        result[featureKey] = currentAbilities?.[featureKey] ?? {};
        return result;
      }, {} as PetAbilities);

      petForm.setFieldsValue({
        feature_keys: featureKeys,
        abilities_json: formatJsonEditor(nextAbilities),
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'abilities JSON 解析失败');
    }
  };

  const handleTogglePetBoolean = async (
    record: PetDefinition,
    field: 'enabled' | 'obtainable_by_egg',
    checked: boolean,
  ) => {
    try {
      await savePetRequest.run({
        pet_id: record.pet_id,
        name: record.name,
        rarity: record.rarity,
        enabled: field === 'enabled' ? checked : record.enabled,
        obtainable_by_egg: field === 'obtainable_by_egg' ? checked : record.obtainable_by_egg,
        display: record.display,
        description: record.description,
        pricing: record.pricing,
        abilities: record.abilities,
      });
      message.success(field === 'enabled' ? '启用状态已更新' : '开蛋获取状态已更新');
      await loadPets();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '状态更新失败');
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
        petDefinitionId: activePet.id,
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
      if (!params) {
        throw new Error('请提供能力参数');
      }

      const updated = await saveAbilityRequest.run({
        petDefinitionId: activePet.id,
        featureKey: values.feature_key,
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
            petDefinitionId: activePet.id,
            featureKey,
          });
          const nextAbilities = { ...(activePet.abilities || {}) };
          delete nextAbilities[featureKey];
          const updatedPet = {
            ...activePet,
            abilities: Object.keys(nextAbilities).length ? nextAbilities : undefined,
          };
          setActivePet(updatedPet);
          replaceAbilitiesForm.setFieldsValue({
            abilities_json: formatJsonEditor(updatedPet.abilities),
          });
          message.success('能力已移除');
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

  const renderDisplayImageField = (
    field: keyof PetDisplay,
    label: string,
    value: string | undefined,
  ) => {
    const trimmed = typeof value === 'string' ? value.trim() : '';

    return (
      <Col span={8}>
        <Form.Item name={['display', field]} label={label}>
          <Input placeholder="相对路径或完整 URL（PNG/JPG 或 .json 骨骼）" allowClear />
        </Form.Item>
        <div style={{ marginTop: -8 }}>
          {trimmed ? (
            <PetDisplayAssetPreview src={trimmed} alt={label} width={104} height={104} />
          ) : (
            <Typography.Text type="secondary">暂无预览</Typography.Text>
          )}
        </div>
      </Col>
    );
  };

  const columns: ProColumns<PetDefinition>[] = [
    {
      title: '图片',
      width: 88,
      render: (_, record) => (
        <PetDisplayAssetPreview
          src={getPetDisplayPreviewUrl(record.display)}
          alt={getLocalizedLabel(record.name)}
          width={72}
          height={72}
        />
      ),
    },
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
      width: 110,
      render: (value, record) => (
        <Switch
          disabled={!canManagePets}
          loading={savePetRequest.loading}
          checked={Boolean(value)}
          checkedChildren="启用"
          unCheckedChildren="关闭"
          style={{ minWidth: 64 }}
          onChange={(checked) => void handleTogglePetBoolean(record, 'enabled', checked)}
        />
      ),
    },
    {
      title: '开蛋获取',
      dataIndex: 'obtainable_by_egg',
      width: 130,
      render: (value, record) => (
        <Switch
          disabled={!canManagePets}
          loading={savePetRequest.loading}
          checked={Boolean(value)}
          checkedChildren="可获得"
          unCheckedChildren="不可获得"
          style={{ minWidth: 82 }}
          onChange={(checked) => void handleTogglePetBoolean(record, 'obtainable_by_egg', checked)}
        />
      ),
    },
    {
      title: '能力',
      width: 220,
      render: (_, record) => {
        const featureKeys = getAbilityFeatureKeys(record.abilities);

        return featureKeys.length ? (
          <Space size={[0, 6]} wrap>
            {featureKeys.map((featureKey) => (
              <Tag key={featureKey}>{featureKey}</Tag>
            ))}
          </Space>
        ) : (
          '-'
        );
      },
    },
    {
      title: '更新时间',
      width: 180,
      render: (_, record) => record.metadata?.updated_at || '-',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 160,
      render: (_, record) => (
        <Space wrap>
          <Button size="small" icon={<EyeOutlined />} onClick={() => openDetailModal(record)}>
            详情
          </Button>
          {canManagePets ? (
            <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)}>
              编辑
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="开蛋配置">
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

        <ProCard style={panelStyle}>
          <QueryFilter<PetFilterValues>
            defaultCollapsed={false}
            initialValues={{ enabled: 'all', rarity: 'all' }}
            labelWidth="auto"
            span={6}
            onFinish={handleFilterSubmit}
            onReset={handleFilterReset}
          >
            <ProFormText
              name="keyword"
              label="关键字"
              placeholder="搜索 pet_id / 名称 / 描述"
            />
            <ProFormSelect
              name="enabled"
              label="状态"
              options={[
                { label: '全部状态', value: 'all' },
                { label: '已启用', value: 'true' },
                { label: '已停用', value: 'false' },
              ]}
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
          headerTitle="开蛋配置列表"
          style={panelStyle}
          search={false}
          options={false}
          toolBarRender={() => [
            <Button key="refresh" icon={<ReloadOutlined />} onClick={() => void loadPets()}>
              刷新
            </Button>,
          ]}
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

      <PetEggSettingModal
        open={eggSettingOpen}
        mode={eggSettingMode}
        pet={eggSettingPet}
        petId={eggSettingPetId}
        petOptions={petRecords.map((item) => ({
          label: `${item.pet_id} · ${getLocalizedLabel(item.name)} · ${item.rarity}`,
          value: item.id,
        }))}
        form={eggSettingForm}
        loading={savePetRequest.loading}
        onCancel={closeEggSettingModal}
        onSave={() => void handleSaveEggSetting()}
        onPetChange={handleEggSettingPetChange}
      />

      <Modal
        width={960}
        title={editingPetId ? `编辑龟种 ${petForm.getFieldValue('pet_id') || ''}` : '新建龟种'}
        open={editorOpen}
        onCancel={closeEditor}
        onOk={() => void handleSavePet()}
        okText="保存"
        confirmLoading={savePetRequest.loading}
        destroyOnHidden
      >
        <Form form={petForm} layout="vertical">
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
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
                  <Form.Item name={['name', 'en-US']} label="英文名称">
                    <Input placeholder="Lava Turtle" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="enabled" label="启用展示" valuePropName="checked">
                    <Switch checkedChildren="启用" unCheckedChildren="停用" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="obtainable_by_egg" label="可开蛋获得" valuePropName="checked">
                    <Switch checkedChildren="可获得" unCheckedChildren="不可获得" />
                  </Form.Item>
                </Col>
              </Row>
            </ProCard>

            <ProCard title="图片资源" size="small" style={panelStyle}>
              <Row gutter={16}>
                {renderDisplayImageField('icon', '图标资源', displayIcon)}
                {renderDisplayImageField('cover', '封面资源', displayCover)}
                {renderDisplayImageField('thumbnail', '缩略图资源', displayThumbnail)}
              </Row>
            </ProCard>

            <ProCard title="描述文案" size="small" style={panelStyle}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name={['description', 'zh-CN']} label="中文描述">
                    <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} placeholder="请输入中文描述" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name={['description', 'en-US']} label="英文描述">
                    <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }} placeholder="请输入英文描述" />
                  </Form.Item>
                </Col>
              </Row>
            </ProCard>

            <ProCard title="价格配置" size="small" style={panelStyle}>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name={['pricing', 'egg_price']} label="开蛋价格">
                    <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name={['pricing', 'egg_discount', 'type']} label="折扣类型">
                    <Select
                      allowClear
                      placeholder="不配置折扣"
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
            </ProCard>

            <ProCard title="Abilities JSON" size="small" style={panelStyle}>
              <Form.Item
                name="feature_keys"
                label="特性模板"
                extra="从特性模板列表选择后，会自动同步 abilities 的 featureKey；已有参数会保留。"
              >
                <Select
                  mode="multiple"
                  showSearch
                  allowClear
                  placeholder="请选择特性模板"
                  optionFilterProp="label"
                  loading={petFeaturesRequest.loading}
                  options={featureOptions.map((item: FeatureCatalogItem) => ({
                    label: `${item.feature_key} · ${getLocalizedLabel(item.name)}`,
                    value: item.feature_key,
                  }))}
                  onChange={handlePetFeatureTemplatesChange}
                />
              </Form.Item>
              <Form.Item name="abilities_json" style={{ marginBottom: 0 }}>
                <Input.TextArea
                  autoSize={{ minRows: 8, maxRows: 16 }}
                  placeholder='{"spark_multiplier":{"base":1.3}}'
                />
              </Form.Item>
            </ProCard>
          </Space>
        </Form>
      </Modal>

      <Modal
        width={980}
        title={activePet ? `能力挂载 - ${activePet.pet_id}` : '能力挂载'}
        open={Boolean(activePet)}
        onCancel={closeAbilitiesModal}
        footer={null}
        destroyOnHidden
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
                loading={deleteAbilityRequest.loading}
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
        confirmLoading={saveAbilityRequest.loading}
        destroyOnHidden
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
          <Form.Item
            name="params_json"
            label="能力参数 JSON"
            extra="按接口契约直接提交 { params }，启用状态请放在 params.enabled 中。"
            rules={[{ required: true, message: '请输入能力参数 JSON' }]}
          >
            <Input.TextArea autoSize={{ minRows: 8, maxRows: 16 }} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
