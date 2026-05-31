import { ReloadOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons';
import { ProCard } from '@ant-design/pro-components';
import { Alert, App, Button, Empty, Input, Space, Spin, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { panelStyle } from '@/features/admin/shared';
import {
  useRequestPredictTags,
  useRequestRefreshPredictTags,
} from '@/hooks/useAdminRequest';
import type { PredictTagRecord } from '@/types/predictTag';

interface PredictTagSidebarProps {
  selectedSlug: string | null;
  onSelect: (tag: PredictTagRecord | null) => void;
  onTagsRefreshed?: () => void;
}

export default function PredictTagSidebar({
  selectedSlug,
  onSelect,
  onTagsRefreshed,
}: PredictTagSidebarProps) {
  const { message } = App.useApp();
  const [keyword, setKeyword] = useState('');
  const predictTagsRequest = useRequestPredictTags();
  const refreshTagsRequest = useRequestRefreshPredictTags();

  const tagRecords = useMemo(
    () => predictTagsRequest.data?.data || [],
    [predictTagsRequest.data?.data],
  );

  const filteredTags = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) {
      return tagRecords;
    }

    return tagRecords.filter((tag) =>
      [tag.slug, tag.name, tag.cnName].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [keyword, tagRecords]);

  const selectedTag = useMemo(
    () => tagRecords.find((tag) => tag.slug === selectedSlug) || null,
    [selectedSlug, tagRecords],
  );

  const loadTags = async () => {
    try {
      await predictTagsRequest.run({
        current: 1,
        pageSize: 200,
        includeCounts: true,
        sort: 'marketCount',
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '标签列表加载失败');
    }
  };

  useEffect(() => {
    void loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefreshMaterialized = async () => {
    try {
      await refreshTagsRequest.run();
      message.success('标签物化刷新完成');
      await loadTags();
      onTagsRefreshed?.();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '标签刷新失败');
    }
  };

  const renderTagItem = (tag: PredictTagRecord, active: boolean) => {
    const label = tag.cnName || tag.name || tag.slug || `#${tag.id}`;

    return (
      <button
        key={tag.slug || String(tag.id)}
        type="button"
        onClick={() => onSelect(active ? null : tag)}
        style={{
          width: '100%',
          border: 'none',
          borderRadius: 10,
          padding: '10px 12px',
          textAlign: 'left',
          cursor: 'pointer',
          background: active ? '#e6f4ff' : 'transparent',
          color: active ? '#1677ff' : '#344054',
        }}
      >
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Text strong={active} ellipsis style={{ maxWidth: 150 }}>
            {label}
          </Typography.Text>
          <Typography.Text type="secondary">{tag.marketCount}</Typography.Text>
        </Space>
        {tag.slug ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {tag.slug}
          </Typography.Text>
        ) : null}
      </button>
    );
  };

  return (
    <ProCard
      title="标签分类"
      style={{ ...panelStyle, width: 280, flexShrink: 0 }}
      extra={
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined />}
          loading={predictTagsRequest.loading}
          onClick={() => void loadTags()}
        />
      }
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索标签..."
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />

        <Button
          block
          icon={<SyncOutlined />}
          loading={refreshTagsRequest.loading}
          onClick={() => void handleRefreshMaterialized()}
        >
          刷新物化
        </Button>

        {predictTagsRequest.error instanceof Error ? (
          <Alert type="error" showIcon message="标签加载失败" description={predictTagsRequest.error.message} />
        ) : null}

        <Spin spinning={predictTagsRequest.loading && !tagRecords.length}>
          <div style={{ maxHeight: 'calc(100vh - 360px)', overflow: 'auto' }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <button
                type="button"
                onClick={() => onSelect(null)}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: !selectedSlug ? '#e6f4ff' : 'transparent',
                  color: !selectedSlug ? '#1677ff' : '#344054',
                }}
              >
                <Typography.Text strong={!selectedSlug}>全部分类</Typography.Text>
              </button>

              {filteredTags.map((tag) => renderTagItem(tag, selectedSlug === tag.slug))}

              {!predictTagsRequest.loading && filteredTags.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无匹配标签" />
              ) : null}
            </Space>
          </div>
        </Spin>

        {selectedTag ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            当前：{selectedTag.cnName || selectedTag.name || selectedTag.slug}
          </Typography.Text>
        ) : null}
      </Space>
    </ProCard>
  );
}
