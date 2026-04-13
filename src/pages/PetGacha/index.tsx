import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { useAccess } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Col,
  Form,
  InputNumber,
  Progress,
  Row,
  Space,
  Statistic,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo } from 'react';
import { panelStyle } from '@/features/admin/shared';
import {
  useRequestPetDefinitions,
  useRequestPetGachaConfig,
  useRequestResetPetGachaConfig,
  useRequestSavePetGachaConfig,
} from '@/hooks/usePetAdminRequest';
import { PET_RARITY_OPTIONS } from '@/types/pet';
import type { GachaPoolConfig, GachaPoolRarityWeights, PetDefinition, PetRarity } from '@/types/pet';

const petRarityOptions = PET_RARITY_OPTIONS;
const probabilityEpsilon = 1e-9;
const recommendedGachaPoolConfig: GachaPoolConfig = {
  enabled: true,
  base_cost: 500,
  rarity_weights: {
    C: 0.4,
    B: 0.3,
    A: 0.15,
    S: 0.1,
    SS: 0.04,
    SSS: 0.01,
  },
};

function formatProbability(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function buildWeights(values: Partial<GachaPoolRarityWeights> | undefined) {
  return petRarityOptions.reduce((result, rarity) => {
    result[rarity] = Number(values?.[rarity] ?? 0);
    return result;
  }, {} as GachaPoolRarityWeights);
}

function normalizeConfig(values: GachaPoolConfig): GachaPoolConfig {
  return {
    enabled: values.enabled === true,
    base_cost: Number(values.base_cost ?? 0),
    rarity_weights: buildWeights(values.rarity_weights),
  };
}

function getProbabilitySum(weights: GachaPoolRarityWeights) {
  return petRarityOptions.reduce((sum, rarity) => sum + Number(weights[rarity] ?? 0), 0);
}

function getEligibleCountsByRarity(records: PetDefinition[]) {
  return petRarityOptions.reduce((result, rarity) => {
    result[rarity] = records.filter(
      (item) => item.rarity === rarity && item.obtainable_by_egg && item.enabled,
    ).length;
    return result;
  }, {} as Record<PetRarity, number>);
}

function validateGachaConfig(
  config: GachaPoolConfig,
  eligibleCountsByRarity: Record<PetRarity, number>,
) {
  const issues: string[] = [];
  const missingCandidateRarities: PetRarity[] = [];
  const weightKeys = Object.keys(config.rarity_weights ?? {});
  const invalidKeys = weightKeys.filter(
    (key) => !petRarityOptions.includes(key as PetRarity),
  );

  if (invalidKeys.length) {
    issues.push(`rarity_weights 存在非法 key：${invalidKeys.join(', ')}`);
  }

  if (!Number.isFinite(config.base_cost) || config.base_cost < 0) {
    issues.push('base_cost 必须大于等于 0');
  }

  petRarityOptions.forEach((rarity) => {
    const value = Number(config.rarity_weights[rarity]);

    if (!Number.isFinite(value)) {
      issues.push(`${rarity} 概率必须是数字`);
      return;
    }

    if (value < 0 || value > 1) {
      issues.push(`${rarity} 概率必须在 0 到 1 之间`);
    }

    if (value > 0 && eligibleCountsByRarity[rarity] === 0) {
      missingCandidateRarities.push(rarity);
    }
  });

  if (missingCandidateRarities.length) {
    issues.push(
      `以下稀有度已配置概率，但当前没有可开蛋获得的龟种：${missingCandidateRarities.join('、')}。请先补充对应龟种，或将这些稀有度概率设为 0`,
    );
  }

  const sum = getProbabilitySum(config.rarity_weights);
  if (Math.abs(sum - 1) > probabilityEpsilon) {
    issues.push(`rarity_weights 概率累加必须等于 1，当前 sum=${sum.toFixed(6)}`);
  }

  return issues;
}

export default function PetGachaPage() {
  const { message } = App.useApp();
  const access = useAccess() as { canManagePets?: boolean };
  const canManagePets = access.canManagePets === true;
  const [form] = Form.useForm<GachaPoolConfig>();
  const watchedConfig = Form.useWatch([], form);

  const gachaConfigRequest = useRequestPetGachaConfig();
  const saveGachaConfigRequest = useRequestSavePetGachaConfig();
  const resetGachaConfigRequest = useRequestResetPetGachaConfig();
  const petListRequest = useRequestPetDefinitions();

  const applyConfig = (config: GachaPoolConfig) => {
    form.setFieldsValue(normalizeConfig(config));
  };

  const loadConfig = async () => {
    try {
      const config = await gachaConfigRequest.run(undefined);
      applyConfig(config);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '开蛋池配置加载失败');
    }
  };

  const loadPetCandidates = async () => {
    try {
      await petListRequest.run({
        current: 1,
        pageSize: 500,
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '可抽取龟种加载失败');
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadConfig(), loadPetCandidates()]);
  };

  useEffect(() => {
    applyConfig(recommendedGachaPoolConfig);
    void refreshAll();
    // Initial bootstrap only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eligiblePetRecords = useMemo(
    () =>
      (petListRequest.data?.data ?? []).filter(
        (item) => item.enabled && item.obtainable_by_egg,
      ),
    [petListRequest.data?.data],
  );
  const eligibleCountsByRarity = useMemo(
    () => getEligibleCountsByRarity(eligiblePetRecords),
    [eligiblePetRecords],
  );
  const liveConfig = useMemo(
    () => normalizeConfig(watchedConfig ?? recommendedGachaPoolConfig),
    [watchedConfig],
  );
  const liveIssues = useMemo(
    () => validateGachaConfig(liveConfig, eligibleCountsByRarity),
    [eligibleCountsByRarity, liveConfig],
  );
  const probabilitySum = useMemo(
    () => getProbabilitySum(liveConfig.rarity_weights),
    [liveConfig.rarity_weights],
  );
  const sumPercent = Math.max(0, Math.min(100, probabilitySum * 100));
  const sumIsValid = Math.abs(probabilitySum - 1) <= probabilityEpsilon;
  const weightedRarityCount = petRarityOptions.filter(
    (rarity) => liveConfig.rarity_weights[rarity] > 0,
  ).length;
  const loading = gachaConfigRequest.loading || petListRequest.loading;

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = normalizeConfig(values);
      const issues = validateGachaConfig(payload, eligibleCountsByRarity);

      if (issues.length) {
        throw new Error(issues.join('；'));
      }

      const saved = await saveGachaConfigRequest.run(payload);
      applyConfig(saved);
      message.success('开蛋池配置已保存');
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleApplyRecommended = () => {
    applyConfig(recommendedGachaPoolConfig);
    message.success('已填入推荐默认值');
  };

  const handleReset = async () => {
    try {
      const config = await resetGachaConfigRequest.run(undefined);
      applyConfig(config);
      message.success('已重置为后端默认配置');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重置默认配置失败');
    }
  };

  return (
    <PageContainer
      title="开蛋池配置"
      extra={[
        <Button key="refresh" icon={<ReloadOutlined />} onClick={() => void refreshAll()}>
          刷新
        </Button>,
        canManagePets ? (
          <Button key="apply-default" icon={<SyncOutlined />} onClick={handleApplyRecommended}>
            应用推荐值
          </Button>
        ) : null,
        canManagePets ? (
          <Button
            key="reset"
            onClick={() => void handleReset()}
            loading={resetGachaConfigRequest.loading}
          >
            重置默认
          </Button>
        ) : null,
        canManagePets ? (
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            loading={saveGachaConfigRequest.loading}
            onClick={() => void handleSave()}
          >
            保存配置
          </Button>
        ) : null,
      ].filter(Boolean)}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {gachaConfigRequest.error instanceof Error ? (
          <Alert
            type="error"
            showIcon
            message="开蛋池配置加载失败"
            description={gachaConfigRequest.error.message}
          />
        ) : null}

        {petListRequest.error instanceof Error ? (
          <Alert
            type="warning"
            showIcon
            message="候选龟种校验未完成"
            description={petListRequest.error.message}
          />
        ) : null}

        <Row gutter={[16, 16]}>
          <Col xs={24} md={6}>
            <ProCard style={panelStyle}>
              <Statistic
                title="总开关"
                value={liveConfig.enabled ? '启用中' : '已关闭'}
                valueStyle={{ color: liveConfig.enabled ? '#1677ff' : '#98a2b3' }}
              />
            </ProCard>
          </Col>
          <Col xs={24} md={6}>
            <ProCard style={panelStyle}>
              <Statistic title="基础费用" value={liveConfig.base_cost} suffix="币" />
            </ProCard>
          </Col>
          <Col xs={24} md={6}>
            <ProCard style={panelStyle}>
              <Statistic
                title="概率合计"
                value={probabilitySum}
                precision={6}
                valueStyle={{ color: sumIsValid ? '#1677ff' : '#ff4d4f' }}
              />
            </ProCard>
          </Col>
          <Col xs={24} md={6}>
            <ProCard style={panelStyle}>
              <Statistic title="可抽稀有度数" value={weightedRarityCount} suffix="/ 6" />
            </ProCard>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <ProCard
              title="基础配置"
              style={panelStyle}
              extra={
                <Space size={8}>
                  <Tag color={liveConfig.enabled ? 'success' : 'default'}>
                    {liveConfig.enabled ? '用户侧可用' : '用户侧不可用'}
                  </Tag>
                  <Tag color={sumIsValid ? 'processing' : 'error'}>
                    概率和 {probabilitySum.toFixed(6)}
                  </Tag>
                </Space>
              }
            >
              <Form
                form={form}
                layout="vertical"
                initialValues={recommendedGachaPoolConfig}
                disabled={!canManagePets}
              >
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="enabled"
                      label="总开关"
                      valuePropName="checked"
                      extra="关闭后，用户侧所有开蛋入口应直接不可用。"
                    >
                      <Switch checkedChildren="启用" unCheckedChildren="关闭" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="base_cost"
                      label="基础费用"
                      rules={[
                        { required: true, message: '请输入基础费用' },
                        {
                          validator: async (_, value) => {
                            if (typeof value !== 'number' || !Number.isFinite(value)) {
                              throw new Error('基础费用必须是数字');
                            }

                            if (value < 0) {
                              throw new Error('基础费用必须大于等于 0');
                            }
                          },
                        },
                      ]}
                    >
                      <InputNumber style={{ width: '100%' }} min={0} precision={0} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Typography.Text type="secondary">
                      推荐值：500，建议与用户侧展示口径保持一致。
                    </Typography.Text>
                    <div style={{ marginTop: 16 }}>
                      <Progress
                        percent={sumPercent}
                        status={sumIsValid ? 'normal' : 'exception'}
                        format={() => `当前 ${(probabilitySum * 100).toFixed(2)}%`}
                      />
                    </div>
                  </Col>
                </Row>

                <Typography.Title level={5} style={{ marginTop: 8 }}>
                  稀有度概率
                </Typography.Title>
                <Row gutter={[16, 16]}>
                  {petRarityOptions.map((rarity) => (
                    <Col key={rarity} xs={24} md={12} xl={8}>
                      <div
                        style={{
                          border: '1px solid #eaecf0',
                          borderRadius: 14,
                          padding: 16,
                          background: '#fafcff',
                        }}
                      >
                        <Space
                          align="center"
                          style={{ width: '100%', justifyContent: 'space-between' }}
                        >
                          <Typography.Text strong>{rarity}</Typography.Text>
                          <Tag color={eligibleCountsByRarity[rarity] > 0 ? 'success' : 'warning'}>
                            候选 {eligibleCountsByRarity[rarity]}
                          </Tag>
                        </Space>
                        <Form.Item
                          style={{ marginTop: 12, marginBottom: 12 }}
                          name={['rarity_weights', rarity]}
                          label="概率"
                          rules={[
                            { required: true, message: `请输入 ${rarity} 概率` },
                            {
                              validator: async (_, value) => {
                                if (typeof value !== 'number' || !Number.isFinite(value)) {
                                  throw new Error('概率必须是数字');
                                }

                                if (value < 0 || value > 1) {
                                  throw new Error('概率必须在 0 到 1 之间');
                                }
                              },
                            },
                          ]}
                        >
                          <InputNumber
                            style={{ width: '100%' }}
                            min={0}
                            max={1}
                            step={0.01}
                            precision={4}
                            addonAfter="%"
                          />
                        </Form.Item>
                        <Progress
                          percent={Math.max(0, Math.min(100, liveConfig.rarity_weights[rarity] * 100))}
                          strokeColor={eligibleCountsByRarity[rarity] > 0 ? '#1677ff' : '#faad14'}
                          format={() => formatProbability(liveConfig.rarity_weights[rarity])}
                        />
                      </div>
                    </Col>
                  ))}
                </Row>
              </Form>
            </ProCard>
          </Col>

          <Col xs={24} xl={8}>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <ProCard title="发布前校验" style={panelStyle} loading={loading}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {liveIssues.length ? (
                    <Alert
                      type="warning"
                      showIcon
                      message="当前配置存在风险"
                      description={
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          {liveIssues.map((issue) => (
                            <Typography.Text key={issue}>{issue}</Typography.Text>
                          ))}
                        </Space>
                      }
                    />
                  ) : (
                    <Alert
                      type="success"
                      showIcon
                      message="配置校验通过"
                      description="概率范围、概率和、可抽取候选检查都已通过。"
                    />
                  )}

                  <div>
                    <Space direction="vertical" size={10} style={{ width: '100%' }}>
                      <Space>
                        {liveIssues.length ? (
                          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                        ) : (
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        )}
                        <Typography.Text strong>保存规则</Typography.Text>
                      </Space>
                      <Typography.Text type="secondary">
                        1. 只允许 C / B / A / S / SS / SSS 六个稀有度。
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        2. 每个概率都必须在 0 到 1 之间。
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        3. 所有概率累加必须等于 1。
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        4. 若某稀有度概率大于 0，则至少要存在 1 只可开蛋获得且启用中的龟种。
                      </Typography.Text>
                    </Space>
                  </div>
                </Space>
              </ProCard>

              <ProCard title="候选池概览" style={panelStyle} loading={petListRequest.loading}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Typography.Text type="secondary">
                    统计口径：`enabled = true` 且 `obtainable_by_egg = true`
                  </Typography.Text>
                  {petRarityOptions.map((rarity) => (
                    <div
                      key={rarity}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <Space size={8}>
                        <Tag color="processing">{rarity}</Tag>
                        <Typography.Text>
                          {formatProbability(liveConfig.rarity_weights[rarity])}
                        </Typography.Text>
                      </Space>
                      <Typography.Text strong>{eligibleCountsByRarity[rarity]} 只</Typography.Text>
                    </div>
                  ))}
                  <Alert
                    type="info"
                    showIcon
                    message="抽取口径"
                    description="用户侧应先按稀有度概率抽样，再在对应稀有度的可开蛋龟种中均分抽取。"
                  />
                </Space>
              </ProCard>
            </Space>
          </Col>
        </Row>
      </Space>
    </PageContainer>
  );
}
