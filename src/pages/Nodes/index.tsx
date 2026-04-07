import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  EditOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Tag,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type { AdminTopicNodeRecord } from '@/types/admin';
import { panelStyle } from '@/features/admin/shared';
import {
  useRequestCreateTopicNode,
  useRequestTopicNodeBy,
  useRequestTopicNodeTree,
  useRequestTopicNodes,
  useRequestUpdateTopicNode,
  useRequestUpdateTopicNodeSort,
} from '@/hooks/useAdminRequest';

interface NodeFormValues {
  name: string;
  description?: string;
  logo?: string;
}

export default function NodesPage() {
  const { message } = App.useApp();
  const [createForm] = Form.useForm<NodeFormValues>();
  const [editForm] = Form.useForm<NodeFormValues>();
  const [editingNode, setEditingNode] = useState<AdminTopicNodeRecord | null>(null);
  const [orderDraft, setOrderDraft] = useState<AdminTopicNodeRecord[]>([]);

  const nodesRequest = useRequestTopicNodes();
  const createNodeRequest = useRequestCreateTopicNode();
  const nodeDetailRequest = useRequestTopicNodeBy();
  const nodeTreeRequest = useRequestTopicNodeTree();
  const updateNodeRequest = useRequestUpdateTopicNode();
  const updateSortRequest = useRequestUpdateTopicNodeSort();

  const loadNodes = async () => {
    try {
      await nodesRequest.run({});
    } catch (error) {
      message.error(error instanceof Error ? error.message : '节点加载失败');
    }
  };

  useEffect(() => {
    void loadNodes();
    // Initial load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setOrderDraft(nodesRequest.data?.data || []);
  }, [nodesRequest.data?.data]);

  const hasOrderChanged = useMemo(() => {
    const source = nodesRequest.data?.data || [];
    if (source.length !== orderDraft.length) {
      return false;
    }

    return source.some((item, index) => item.id !== orderDraft[index]?.id);
  }, [nodesRequest.data?.data, orderDraft]);

  const moveNode = (index: number, direction: 'up' | 'down') => {
    setOrderDraft((current) => {
      const next = [...current];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handleCreateNode = async (values: NodeFormValues) => {
    try {
      await createNodeRequest.run({
        name: values.name,
        description: values.description,
        logo: values.logo,
        status: 1,
      });
      message.success('节点已创建');
      createForm.resetFields();
      await loadNodes();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '节点创建失败');
    }
  };

  const handleUpdateNode = async (values: NodeFormValues) => {
    if (!editingNode) {
      return;
    }

    try {
      await updateNodeRequest.run({
        id: editingNode.id,
        name: values.name,
        description: values.description,
        logo: values.logo,
        status: editingNode.status,
      });
      message.success('节点已更新');
      setEditingNode(null);
      editForm.resetFields();
      await loadNodes();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '节点更新失败');
    }
  };

  const handleSaveSort = async () => {
    try {
      await updateSortRequest.run(orderDraft.map((item) => item.id));
      message.success('节点排序已更新');
      await loadNodes();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '排序更新失败');
    }
  };

  return (
    <PageContainer title="节点管理">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {nodesRequest.error instanceof Error ? (
          <Alert
            type="error"
            showIcon
            message="节点列表加载失败"
            description={nodesRequest.error.message}
          />
        ) : null}

        <ProCard title="创建节点" style={panelStyle}>
          <Form form={createForm} layout="inline" onFinish={(values) => void handleCreateNode(values)}>
            <Form.Item
              name="name"
              rules={[{ required: true, message: '请输入节点名称' }]}
              style={{ minWidth: 220 }}
            >
              <Input placeholder="节点名称" />
            </Form.Item>
            <Form.Item name="description" style={{ minWidth: 260 }}>
              <Input placeholder="节点描述" />
            </Form.Item>
            <Form.Item name="logo" style={{ minWidth: 180 }}>
              <Input placeholder="Logo 地址" />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<PlusOutlined />}
                loading={createNodeRequest.loading}
              >
                创建
              </Button>
            </Form.Item>
          </Form>
        </ProCard>

        <ProCard title="节点目录视图" style={panelStyle}>
          <Space wrap>
            {(nodeTreeRequest.data || []).map((node) => (
              <Tag key={node.id}>{node.name}</Tag>
            ))}
            {!(nodeTreeRequest.data || []).length ? <span>暂无节点目录数据</span> : null}
          </Space>
        </ProCard>

        <ProCard
          title="节点列表"
          extra={
            <Button
              type="primary"
              icon={<SaveOutlined />}
              disabled={!hasOrderChanged}
              loading={updateSortRequest.loading}
              onClick={() => void handleSaveSort()}
            >
              保存排序
            </Button>
          }
          style={panelStyle}
        >
          <Table
            rowKey="id"
            loading={nodesRequest.loading}
            pagination={false}
            dataSource={orderDraft}
            columns={[
              { title: 'ID', dataIndex: 'id', width: 80 },
              { title: '名称', dataIndex: 'name', width: 180 },
              { title: '描述', dataIndex: 'description', render: (value?: string) => value || '-' },
              {
                title: '状态',
                dataIndex: 'status',
                width: 100,
                render: (value?: number) => (
                  <Tag color={value === 1 ? 'success' : 'default'}>
                    {value === 1 ? '启用' : '停用'}
                  </Tag>
                ),
              },
              { title: '排序号', dataIndex: 'sortNo', width: 100 },
              {
                title: '排序',
                width: 120,
                render: (_, __, index) => (
                  <Space>
                    <Button
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0}
                      onClick={() => moveNode(index, 'up')}
                    />
                    <Button
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={index === orderDraft.length - 1}
                      onClick={() => moveNode(index, 'down')}
                    />
                  </Space>
                ),
              },
              {
                title: '操作',
                width: 100,
                render: (_, record) => (
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    loading={nodeDetailRequest.loading}
                    onClick={async () => {
                      try {
                        const detail = await nodeDetailRequest.run(record.id);
                        setEditingNode(detail);
                        editForm.setFieldsValue({
                          name: detail.name,
                          description: detail.description,
                          logo: detail.logo,
                        });
                      } catch (error) {
                        message.error(error instanceof Error ? error.message : '节点详情加载失败');
                      }
                    }}
                  >
                    编辑
                  </Button>
                ),
              },
            ]}
          />
        </ProCard>
      </Space>

      <Modal
        title="编辑节点"
        open={Boolean(editingNode)}
        onCancel={() => setEditingNode(null)}
        onOk={() => void editForm.submit()}
        confirmLoading={updateNodeRequest.loading}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={(values) => void handleUpdateNode(values)}>
          <Form.Item
            name="name"
            label="节点名称"
            rules={[{ required: true, message: '请输入节点名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="logo" label="Logo 地址">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
