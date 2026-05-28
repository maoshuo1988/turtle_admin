import type { CSSProperties } from 'react';
import {
  Button,
  Empty,
  Flex,
  Form,
  List,
  Modal,
  Select,
  Switch,
  Tag,
  Typography,
  type FormInstance,
} from 'antd';
import { PetDisplayAssetPreview } from '@/components/PetDisplayAssetPreview';
import type { PetAbilities, PetDefinition } from '@/types/pet';
import { getLocalizedLabel } from '@/utils/petAdminAdapters';
import { getPetDisplayPreviewUrl } from '@/utils/petAssetUrl';

export type EggSettingMode = 'create' | 'edit' | 'detail';

export interface EggSettingFormValues {
  enabled?: boolean;
  obtainable_by_egg?: boolean;
}

interface PetOption {
  label: string;
  value: string;
}

interface PetEggSettingModalProps {
  open: boolean;
  mode: EggSettingMode;
  pet?: PetDefinition;
  petId?: string;
  petOptions: PetOption[];
  form: FormInstance<EggSettingFormValues>;
  loading?: boolean;
  onCancel: () => void;
  onSave: () => void;
  onPetChange: (petDefinitionId?: string) => void;
}

function getAbilityFeatureKeys(abilities: PetAbilities | undefined) {
  if (!abilities) {
    return [];
  }

  return Object.keys(abilities);
}

const SETTING_ROWS = [
  {
    key: 'enabled',
    name: 'enabled' as const,
    title: '启用',
    description: '控制该龟种是否在客户端展示',
    checkedChildren: '启用',
    unCheckedChildren: '关闭',
    minWidth: 64,
    read: (pet: PetDefinition) => Boolean(pet.enabled),
  },
  {
    key: 'obtainable',
    name: 'obtainable_by_egg' as const,
    title: '开蛋获取',
    description: '控制是否可通过开蛋获取',
    checkedChildren: '可获得',
    unCheckedChildren: '不可获得',
    minWidth: 82,
    read: (pet: PetDefinition) => Boolean(pet.obtainable_by_egg),
  },
] as const;

function renderPetSettingSwitch(
  item: (typeof SETTING_ROWS)[number],
  options?: { checked?: boolean; disabled?: boolean; loading?: boolean },
) {
  return (
    <Switch
      {...(options?.checked !== undefined ? { checked: options.checked } : {})}
      disabled={options?.disabled}
      loading={options?.loading}
      checkedChildren={item.checkedChildren}
      unCheckedChildren={item.unCheckedChildren}
      style={{ minWidth: item.minWidth }}
    />
  );
}

const heroStyle: CSSProperties = {
  padding: 20,
  borderRadius: 16,
  background: 'linear-gradient(135deg, #f8fafc 0%, #eef4ff 100%)',
  border: '1px solid #e4e7ec',
};

const previewFrameStyle: CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: 16,
  background: '#fff',
  border: '1px solid #e4e7ec',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  flexShrink: 0,
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.06)',
};

const sectionLabelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 10,
  fontSize: 13,
  fontWeight: 600,
  color: '#344054',
};

export default function PetEggSettingModal({
  open,
  mode,
  pet,
  petId,
  petOptions,
  form,
  loading,
  onCancel,
  onSave,
  onPetChange,
}: PetEggSettingModalProps) {
  const readonly = mode === 'detail';
  const abilityKeys = pet ? getAbilityFeatureKeys(pet.abilities) : [];

  const title =
    mode === 'detail'
      ? '开蛋配置详情'
      : mode === 'edit'
        ? '编辑开蛋配置'
        : '新增开蛋配置';

  const footer = readonly
    ? [
        <Button key="close" type="primary" onClick={onCancel}>
          关闭
        </Button>,
      ]
    : [
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={loading}
          disabled={!pet}
          onClick={onSave}
        >
          {mode === 'edit' ? '保存修改' : '确认新增'}
        </Button>,
      ];

  return (
    <Modal
      width={640}
      centered
      destroyOnHidden
      title={pet ? `${title} · ${getLocalizedLabel(pet.name)}` : title}
      open={open}
      onCancel={onCancel}
      footer={footer}
      styles={{
        body: { paddingTop: 4, paddingBottom: 8 },
      }}
    >
      {mode === 'create' ? (
        <Select
          showSearch
          allowClear
          size="large"
          placeholder="搜索并选择龟种"
          value={petId}
          optionFilterProp="label"
          options={petOptions}
          onChange={(value) => onPetChange(value)}
          style={{ width: '100%', marginBottom: pet ? 20 : 0 }}
        />
      ) : null}

      {!pet ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={mode === 'create' ? '请选择龟种后继续配置' : '未找到龟种信息'}
          style={{ padding: '32px 0 16px' }}
        />
      ) : (
        <Flex vertical gap={20}>
          <div style={heroStyle}>
            <Flex gap={20} align="flex-start">
              <div style={previewFrameStyle}>
                <PetDisplayAssetPreview
                  src={getPetDisplayPreviewUrl(pet.display)}
                  alt={getLocalizedLabel(pet.name)}
                  width={88}
                  height={88}
                />
              </div>
              <Flex vertical flex={1} gap={10} style={{ minWidth: 0 }}>
                <Flex align="center" gap={8} wrap>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {getLocalizedLabel(pet.name)}
                  </Typography.Title>
                  <Tag color="processing">{pet.rarity}</Tag>
                </Flex>
                <Typography.Text type="secondary" copyable={{ text: pet.pet_id }}>
                  {pet.pet_id}
                </Typography.Text>
                <Flex gap={24} wrap>
                  <Typography.Text>
                    <Typography.Text type="secondary">中文 </Typography.Text>
                    {pet.name['zh-CN'] || '-'}
                  </Typography.Text>
                  <Typography.Text>
                    <Typography.Text type="secondary">英文 </Typography.Text>
                    {pet.name['en-US'] || '-'}
                  </Typography.Text>
                </Flex>
              </Flex>
            </Flex>
          </div>

          <div>
            <Typography.Text style={sectionLabelStyle}>能力</Typography.Text>
            {abilityKeys.length ? (
              <Flex gap={8} wrap>
                {abilityKeys.map((featureKey) => (
                  <Tag key={featureKey}>{featureKey}</Tag>
                ))}
              </Flex>
            ) : (
              <Typography.Text type="secondary">暂未配置能力</Typography.Text>
            )}
          </div>

          <div>
            <Typography.Text style={sectionLabelStyle}>开蛋配置</Typography.Text>
            {readonly ? (
              <List
                bordered
                size="large"
                dataSource={[...SETTING_ROWS]}
                renderItem={(item) => (
                  <List.Item actions={[renderPetSettingSwitch(item, { checked: item.read(pet), disabled: true })]}>
                    <List.Item.Meta title={item.title} description={item.description} />
                  </List.Item>
                )}
              />
            ) : (
              <Form form={form} requiredMark={false} colon={false}>
                <List
                  bordered
                  size="large"
                  dataSource={[...SETTING_ROWS]}
                  renderItem={(item) => (
                    <List.Item
                      actions={[
                        <Form.Item
                          key={item.key}
                          name={item.name}
                          valuePropName="checked"
                          style={{ marginBottom: 0 }}
                        >
                          {renderPetSettingSwitch(item, { loading })}
                        </Form.Item>,
                      ]}
                    >
                      <List.Item.Meta title={item.title} description={item.description} />
                    </List.Item>
                  )}
                />
              </Form>
            )}
          </div>
        </Flex>
      )}
    </Modal>
  );
}
