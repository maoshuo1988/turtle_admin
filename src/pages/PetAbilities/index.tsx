import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  PageContainer,
  ProCard,
  ProFormText,
  ProTable,
  QueryFilter,
  type ProColumns,
} from '@ant-design/pro-components';
import { Alert, App, Button, Descriptions, Modal, Space, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { panelStyle } from '@/features/admin/shared';
import { useRequestPetAbilityOptions } from '@/hooks/usePetAdminRequest';
import type { AbilityOption } from '@/types/pet';

interface AbilityFilterValues {
  keyword?: string;
  featureKey?: string;
  rarity?: AbilityOption['sourcePet']['rarity'] | 'all';
  selectableOnly?: 'true' | 'false';
}

function formatJson(value: unknown) {
  if (!value || (typeof value === 'object' && !Object.keys(value as Record<string, unknown>).length)) {
    return '{}';
  }

  return JSON.stringify(value, null, 2);
}

export default function PetAbilitiesPage() {
  const { message } = App.useApp();
  const [filters, setFilters] = useState<AbilityFilterValues>({
    rarity: 'all',
    selectableOnly: 'true',
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<AbilityOption | null>(null);

  const abilityOptionsRequest = useRequestPetAbilityOptions();

  const buildQueryParams = (nextFilters: AbilityFilterValues) => ({
    keyword: nextFilters.keyword?.trim() || undefined,
    featureKey: nextFilters.featureKey?.trim() || undefined,
    rarity: nextFilters.rarity ?? 'all',
    selectableOnly: nextFilters.selectableOnly !== 'false',
  });

  const loadData = async (nextFilters = filters) => {
    try {
      await abilityOptionsRequest.run(buildQueryParams(nextFilters));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '能力预设列表加载失败');
    }
  };

  useEffect(() => {
    void loadData();
    // Initial bootstrap only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abilityRows = useMemo(
    () => abilityOptionsRequest.data?.data || [],
    [abilityOptionsRequest.data?.data],
  );

  const handleFilterSubmit = async (values: AbilityFilterValues) => {
    const nextFilters: AbilityFilterValues = {
      keyword: values.keyword,
      featureKey: values.featureKey,
      rarity: values.rarity ?? 'all',
      selectableOnly: values.selectableOnly ?? 'true',
    };
    setFilters(nextFilters);
    await loadData(nextFilters);
  };

  const handleFilterReset = () => {
    const nextFilters: AbilityFilterValues = {
      rarity: 'all',
      selectableOnly: 'true',
    };
    setFilters(nextFilters);
    void loadData(nextFilters);
  };

  const openDetailModal = (record: AbilityOption) => {
    setDetailRecord(record);
    setDetailOpen(true);
  };

  const columns: ProColumns<AbilityOption>[] = [
    {
      title: 'optionKey',
      dataIndex: 'optionKey',
      width: 180,
      render: (_, record) => <Typography.Text code>{record.optionKey}</Typography.Text>,
    },
    {
      title: '名称',
      dataIndex: 'name',
      width: 180,
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: '来源龟种',
      dataIndex: 'sourcePet',
      width: 160,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Typography.Text>{record.sourcePet.name || '-'}</Typography.Text>
          {/* <Typography.Text type="secondary" code>
            {record.sourcePet.petKey || '-'}
          </Typography.Text> */}
        </Space>
      ),
    },
    // {
    //   title: '稀有度',
    //   dataIndex: ['sourcePet', 'rarity'],
    //   width: 90,
    //   render: (_, record) =>
    //     record.sourcePet.rarity ? (
    //       <Tag color="processing">{record.sourcePet.rarity}</Tag>
    //     ) : (
    //       '-'
    //     ),
    // },
    {
      title: 'featureKeys',
      dataIndex: 'featureKeys',
      width: 160,
      render: (_, record) =>
        record.featureKeys.length ? (
          <Space wrap size={[4, 4]}>
            {record.featureKeys.map((featureKey) => (
              <Tag key={featureKey}>{featureKey}</Tag>
            ))}
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: '生效事件',
      dataIndex: 'effectiveEvents',
      width: 160,
      render: (_, record) =>
        record.effectiveEvents.length ? (
          <Space wrap size={[4, 4]}>
            {record.effectiveEvents.map((event) => (
              <Tag key={event}>{event}</Tag>
            ))}
          </Space>
        ) : (
          '-'
        ),
    },
    {
      title: '可选',
      dataIndex: 'selectable',
      width: 100,
      render: (_, record) =>
        record.selectable ? (
          <Tag color="success">可选</Tag>
        ) : (
          <Tag color="default" title={record.disabledReason || undefined}>
            不可选
          </Tag>
        ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 100,
      render: (_, record) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openDetailModal(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <PageContainer>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {abilityOptionsRequest.error instanceof Error ? (
          <Alert
            type="error"
            showIcon
            message="能力预设列表加载失败"
            description={abilityOptionsRequest.error.message}
          />
        ) : null}

        <ProCard style={panelStyle}>
          <QueryFilter<AbilityFilterValues>
            defaultCollapsed={false}
            initialValues={{ rarity: 'all', selectableOnly: 'true' }}
            onFinish={handleFilterSubmit}
            onReset={handleFilterReset}
          >
            <ProFormText name="keyword" label="关键字" placeholder="搜索 optionKey / 名称 / 描述" />
            {/* <ProFormText
              name="featureKey"
              label="featureKey"
              placeholder="例如 signin_bonus"
            /> */}
            {/* <ProFormSelect
              name="rarity"
              label="来源稀有度"
              options={[
                { label: '全部稀有度', value: 'all' },
                ...PET_RARITY_OPTIONS.map((item) => ({ label: item, value: item })),
              ]}
            />
            <ProFormSelect
              name="selectableOnly"
              label="可选状态"
              options={[
                { label: '仅当前可选', value: 'true' },
                { label: '包含不可选', value: 'false' },
              ]}
            /> */}
          </QueryFilter>
        </ProCard>

        <ProTable<AbilityOption>
          headerTitle="能力预设列表"
          style={panelStyle}
          search={false}
          options={false}
          toolBarRender={() => [
            <Button key="refresh" icon={<ReloadOutlined />} onClick={() => void loadData()}>
              刷新
            </Button>,
          ]}
          tableAlertRender={false}
          tableAlertOptionRender={false}
          rowKey="optionKey"
          loading={abilityOptionsRequest.loading}
          dataSource={abilityRows}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          columns={columns}
        />
      </Space>

      <Modal
        width={760}
        title={detailRecord ? `能力预设 ${detailRecord.optionKey}` : '能力预设详情'}
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetailRecord(null);
        }}
        footer={null}
        destroyOnHidden
      >
        {detailRecord ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="optionKey">{detailRecord.optionKey}</Descriptions.Item>
              <Descriptions.Item label="名称">{detailRecord.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="描述">{detailRecord.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="来源龟种">
                {detailRecord.sourcePet.name || '-'} / {detailRecord.sourcePet.petKey || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="稀有度">
                {detailRecord.sourcePet.rarity || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="featureKeys">
                {detailRecord.featureKeys.length ? detailRecord.featureKeys.join(', ') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="生效事件">
                {detailRecord.effectiveEvents.length ? detailRecord.effectiveEvents.join(', ') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="可选">
                {detailRecord.selectable ? '是' : '否'}
                {!detailRecord.selectable && detailRecord.disabledReason
                  ? `（${detailRecord.disabledReason}）`
                  : null}
              </Descriptions.Item>
            </Descriptions>
            <div>
              <Typography.Text type="secondary">abilities（可直接合并到 PetDefinition.abilities）</Typography.Text>
              <Typography.Paragraph>
                <pre
                  style={{
                    margin: '8px 0 0',
                    padding: 12,
                    borderRadius: 8,
                    background: '#fafafa',
                    border: '1px solid #eaecf0',
                    overflow: 'auto',
                    maxHeight: 320,
                  }}
                >
                  {formatJson(detailRecord.abilities)}
                </pre>
              </Typography.Paragraph>
            </div>
          </Space>
        ) : null}
      </Modal>
    </PageContainer>
  );
}
