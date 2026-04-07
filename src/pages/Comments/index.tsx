import { DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { panelStyle } from '@/features/admin/shared';
import { useRequestComments, useRequestDeleteComment } from '@/hooks/useAdminRequest';

interface CommentSearchValues {
  id?: number;
  userId?: number;
  entityType?: string;
  entityId?: number;
  status?: number;
}

export default function CommentsPage() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<CommentSearchValues>();
  const commentsRequest = useRequestComments();
  const deleteCommentRequest = useRequestDeleteComment();
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (values: CommentSearchValues) => {
    const hasCondition = Object.values(values).some((value) => value !== undefined && value !== '');

    if (!hasCondition) {
      message.warning('请至少填写一个筛选条件后再检索评论');
      return;
    }

    try {
      await commentsRequest.run({
        current: 1,
        pageSize: 100,
        ...values,
      });
      setHasSearched(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '评论检索失败');
    }
  };

  return (
    <PageContainer title="评论管理">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {commentsRequest.error instanceof Error ? (
          <Alert
            type="error"
            showIcon
            message="评论列表加载失败"
            description={commentsRequest.error.message}
          />
        ) : null}

        <ProCard style={panelStyle}>
          <Form
            form={form}
            layout="inline"
            onFinish={(values) => void handleSearch(values)}
            style={{ rowGap: 12 }}
          >
            <Form.Item name="id" label="评论ID">
              <InputNumber min={1} placeholder="评论ID" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="userId" label="用户ID">
              <InputNumber min={1} placeholder="用户ID" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="entityType" label="实体类型">
              <Input placeholder="如 topic / battle" style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="entityId" label="实体ID">
              <InputNumber min={1} placeholder="实体ID" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="status" label="状态">
              <Select
                allowClear
                placeholder="状态"
                style={{ width: 120 }}
                options={[
                  { label: '正常', value: 0 },
                  { label: '删除', value: 1 },
                ]}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SearchOutlined />}
                  loading={commentsRequest.loading}
                >
                  搜索
                </Button>
                <Button
                  onClick={() => {
                    form.resetFields();
                    setHasSearched(false);
                  }}
                >
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </ProCard>

        {!hasSearched ? (
          <Alert
            type="info"
            showIcon
            message="评论检索要求至少填写一个筛选条件"
          />
        ) : null}

        <ProCard style={panelStyle}>
          <Table
            rowKey="id"
            loading={commentsRequest.loading}
            pagination={false}
            dataSource={commentsRequest.data?.data || []}
            columns={[
              { title: '评论ID', dataIndex: 'id', width: 90 },
              { title: '用户ID', dataIndex: 'userId', width: 90 },
              {
                title: '作者',
                dataIndex: 'userName',
                width: 120,
                render: (value?: string) => value || '-',
              },
              {
                title: '实体',
                width: 160,
                render: (_, record) => (
                  <Space>
                    <Tag>{record.entityType || '-'}</Tag>
                    <Typography.Text>{record.entityId || '-'}</Typography.Text>
                  </Space>
                ),
              },
              {
                title: '状态',
                dataIndex: 'status',
                width: 100,
                render: (value?: number) => (
                  <Tag color={value === 0 ? 'success' : 'default'}>
                    {value === 0 ? '正常' : '非正常'}
                  </Tag>
                ),
              },
              {
                title: '内容',
                dataIndex: 'content',
                render: (value: string) => (
                  <Typography.Paragraph ellipsis={{ rows: 2, expandable: true, symbol: '展开' }} style={{ marginBottom: 0 }}>
                    {value || '-'}
                  </Typography.Paragraph>
                ),
              },
              {
                title: '操作',
                width: 120,
                render: (_, record) => (
                  <Button
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    loading={deleteCommentRequest.loading}
                    onClick={() => {
                      modal.confirm({
                        title: '确认删除评论？',
                        content: `评论 #${record.id}`,
                        okText: '删除',
                        okButtonProps: { danger: true },
                        cancelText: '取消',
                        onOk: async () => {
                          try {
                            await deleteCommentRequest.run(record.id);
                            message.success('评论已删除');
                            await commentsRequest.refresh();
                          } catch (error) {
                            message.error(error instanceof Error ? error.message : '删除评论失败');
                          }
                        },
                      });
                    }}
                  >
                    删除
                  </Button>
                ),
              },
            ]}
          />
        </ProCard>
      </Space>
    </PageContainer>
  );
}
