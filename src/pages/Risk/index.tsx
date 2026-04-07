import {
  CheckCircleOutlined,
  CrownOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  StopOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
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
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
  useRequestCreateForbiddenWord,
  useRequestDeleteForbiddenWord,
  useRequestForbiddenUser,
  useRequestForbiddenWordBy,
  useRequestForbiddenWords,
  useRequestGrantAdmin,
  useRequestMintCoins,
  useRequestRevokeAdmin,
  useRequestRiskOverview,
  useRequestUpdateForbiddenWord,
  useRequestUpdateUserReport,
  useRequestUserReportBy,
  useRequestUserReports,
  useRequestUsers,
} from '@/hooks/useAdminRequest';
import { panelStyle } from '@/features/admin/shared';
import type { AdminForbiddenWordRecord, AdminUserRecord, AdminUserReportRecord } from '@/types/admin';

type RiskTab = 'reports' | 'words' | 'users';

export default function RiskPage() {
  const { message, modal } = App.useApp();
  const [tab, setTab] = useState<RiskTab>('reports');
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'handled'>('all');
  const [wordForm] = Form.useForm<{ word: string }>();
  const [editWordForm] = Form.useForm<{ word: string; status: number }>();
  const [mintForm] = Form.useForm<{ amount: number; remark?: string }>();
  const [mintModalUser, setMintModalUser] = useState<AdminUserRecord | null>(null);
  const [editingWord, setEditingWord] = useState<AdminForbiddenWordRecord | null>(null);
  const [activeReport, setActiveReport] = useState<AdminUserReportRecord | null>(null);

  const reportsRequest = useRequestUserReports();
  const reportDetailRequest = useRequestUserReportBy();
  const updateReportRequest = useRequestUpdateUserReport();
  const riskOverviewRequest = useRequestRiskOverview();
  const forbiddenWordsRequest = useRequestForbiddenWords();
  const forbiddenWordDetailRequest = useRequestForbiddenWordBy();
  const createForbiddenWordRequest = useRequestCreateForbiddenWord();
  const updateForbiddenWordRequest = useRequestUpdateForbiddenWord();
  const deleteForbiddenWordRequest = useRequestDeleteForbiddenWord();
  const usersRequest = useRequestUsers();
  const forbiddenUserRequest = useRequestForbiddenUser();
  const grantAdminRequest = useRequestGrantAdmin();
  const revokeAdminRequest = useRequestRevokeAdmin();
  const mintCoinsRequest = useRequestMintCoins();

  const loadData = async () => {
    await Promise.all([
      reportsRequest.run({ current: 1, pageSize: 100 }),
      forbiddenWordsRequest.run({ current: 1, pageSize: 100 }),
      usersRequest.run({ current: 1, pageSize: 100 }),
    ]);
  };

  useEffect(() => {
    void loadData();
    // Initial page hydration loads reports, forbidden words and users together.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredReports = useMemo(() => {
    const list = reportsRequest.data?.data || [];
    if (reportFilter === 'pending') {
      return list.filter((item) => item.auditStatus === 0);
    }

    if (reportFilter === 'handled') {
      return list.filter((item) => item.auditStatus !== 0);
    }

    return list;
  }, [reportFilter, reportsRequest.data?.data]);

  const handleAuditReport = async (id: number, auditStatus: number) => {
    try {
      await updateReportRequest.run({
        id,
        auditStatus,
        auditTime: Math.floor(Date.now() / 1000),
      });
      message.success('举报处理已更新');
      await reportsRequest.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '举报处理失败');
    }
  };

  const handleCreateWord = async (values: { word: string }) => {
    try {
      await createForbiddenWordRequest.run({
        word: values.word,
        status: 1,
        type: 1,
      });
      wordForm.resetFields();
      message.success('敏感词已创建');
      await forbiddenWordsRequest.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '敏感词创建失败');
    }
  };

  const openWordEditor = async (record: AdminForbiddenWordRecord) => {
    try {
      const detail = await forbiddenWordDetailRequest.run(record.id);
      setEditingWord(detail);
      editWordForm.setFieldsValue({
        word: detail.word,
        status: detail.status,
      });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '敏感词详情加载失败');
    }
  };

  const handleUpdateWord = async () => {
    if (!editingWord) {
      return;
    }

    try {
      const values = await editWordForm.validateFields();
      await updateForbiddenWordRequest.run({
        id: editingWord.id,
        type: editingWord.type,
        word: values.word,
        status: values.status,
      });
      message.success('敏感词已更新');
      setEditingWord(null);
      editWordForm.resetFields();
      await forbiddenWordsRequest.refresh();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const handleMuteUser = async (userId: number, days: number) => {
    try {
      await forbiddenUserRequest.run({
        userId,
        days,
      });
      message.success(days === 0 ? '用户已解禁' : '用户已禁言');
      await usersRequest.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '用户状态更新失败');
    }
  };

  const openReportDetail = async (record: AdminUserReportRecord) => {
    try {
      const detail = await reportDetailRequest.run(record.id);
      setActiveReport(detail);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '举报详情加载失败');
    }
  };

  const openMintModal = (user: AdminUserRecord) => {
    setMintModalUser(user);
    mintForm.setFieldsValue({
      amount: 100,
      remark: '',
    });
  };

  const closeMintModal = () => {
    setMintModalUser(null);
    mintForm.resetFields();
  };

  const handleMintCoins = async () => {
    if (!mintModalUser) {
      return;
    }

    try {
      const values = await mintForm.validateFields();
      await mintCoinsRequest.run({
        userId: mintModalUser.id,
        amount: values.amount,
        remark: values.remark?.trim() || undefined,
      });
      message.success('发币成功');
      closeMintModal();
      await usersRequest.refresh();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  const reportError = reportsRequest.error instanceof Error ? reportsRequest.error : undefined;
  const wordsError = forbiddenWordsRequest.error instanceof Error ? forbiddenWordsRequest.error : undefined;
  const usersError = usersRequest.error instanceof Error ? usersRequest.error : undefined;

  return (
    <PageContainer title="风控中心">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div className="turtle-page-toolbar">
          <Segmented
            block
            options={[
              { label: `举报审核 (${reportsRequest.data?.total || 0})`, value: 'reports' },
              { label: `敏感词 (${forbiddenWordsRequest.data?.total || 0})`, value: 'words' },
              { label: `用户管理 (${usersRequest.data?.total || 0})`, value: 'users' },
            ]}
            value={tab}
            onChange={(value) => setTab(value as RiskTab)}
          />
        </div>

        {tab === 'reports' ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div className="turtle-page-toolbar turtle-page-toolbar-with-tabs">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {reportError ? (
                  <Alert type="error" showIcon message="举报列表加载失败" description={reportError.message} />
                ) : null}

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <ProCard style={panelStyle}>
                      <Typography.Title level={4} style={{ margin: 0 }}>
                        {riskOverviewRequest.data?.alerts.filter((item) => !item.handled).length ?? 0}
                      </Typography.Title>
                      <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                        待处理风险告警
                      </Typography.Paragraph>
                    </ProCard>
                  </Col>
                  <Col xs={24} sm={12}>
                    <ProCard style={panelStyle}>
                      <Typography.Title level={4} style={{ margin: 0 }}>
                        {riskOverviewRequest.data?.bannedUsers.length ?? 0}
                      </Typography.Title>
                      <Typography.Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                        当前禁言用户
                      </Typography.Paragraph>
                    </ProCard>
                  </Col>
                </Row>

                <Segmented
                  options={[
                    { label: '全部', value: 'all' },
                    { label: '待处理', value: 'pending' },
                    { label: '已处理', value: 'handled' },
                  ]}
                  value={reportFilter}
                  onChange={(value) => setReportFilter(value as 'all' | 'pending' | 'handled')}
                />
              </Space>
            </div>

            <ProCard style={panelStyle}>
              <Table
                rowKey="id"
                loading={reportsRequest.loading}
                pagination={false}
                dataSource={filteredReports}
                columns={[
                  { title: 'ID', dataIndex: 'id', width: 80 },
                  {
                    title: '对象',
                    width: 180,
                    render: (_, record) => `${record.dataType || 'unknown'} / ${record.dataId || '-'}`,
                  },
                  { title: '原因', dataIndex: 'reason' },
                  {
                    title: '状态',
                    dataIndex: 'auditStatus',
                    width: 120,
                    render: (value: number) => (
                      <Tag color={value === 0 ? 'warning' : 'success'}>
                        {value === 0 ? '待处理' : '已处理'}
                      </Tag>
                    ),
                  },
                  {
                    title: '操作',
                    width: 220,
                    render: (_, record) => (
                      <Space wrap>
                        <Button
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => void openReportDetail(record)}
                        >
                          查看
                        </Button>
                        <Button
                          size="small"
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          loading={updateReportRequest.loading}
                          onClick={() => void handleAuditReport(record.id, 1)}
                        >
                          通过
                        </Button>
                        <Button
                          size="small"
                          icon={<UndoOutlined />}
                          loading={updateReportRequest.loading}
                          onClick={() => void handleAuditReport(record.id, 2)}
                        >
                          驳回
                        </Button>
                      </Space>
                    ),
                  },
                ]}
              />
            </ProCard>
          </Space>
        ) : null}

        {tab === 'words' ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div className="turtle-page-toolbar turtle-page-toolbar-with-tabs">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {wordsError ? (
                  <Alert type="error" showIcon message="敏感词加载失败" description={wordsError.message} />
                ) : null}

                <ProCard style={panelStyle}>
                  <Form form={wordForm} layout="inline" onFinish={(values) => void handleCreateWord(values)}>
                    <Form.Item
                      name="word"
                      rules={[{ required: true, message: '请输入敏感词' }]}
                      style={{ flex: 1, minWidth: 260 }}
                    >
                      <Input placeholder="新增敏感词..." />
                    </Form.Item>
                    <Form.Item style={{ marginRight: 0 }}>
                      <Button
                        type="primary"
                        htmlType="submit"
                        icon={<PlusOutlined />}
                        loading={createForbiddenWordRequest.loading}
                      >
                        添加
                      </Button>
                    </Form.Item>
                  </Form>
                </ProCard>
              </Space>
            </div>

            <ProCard style={panelStyle}>
              <Table
                rowKey="id"
                loading={forbiddenWordsRequest.loading}
                pagination={false}
                dataSource={forbiddenWordsRequest.data?.data || []}
                columns={[
                  { title: 'ID', dataIndex: 'id', width: 80 },
                  { title: '敏感词', dataIndex: 'word' },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    width: 100,
                    render: (value: number) => <Tag color={value === 1 ? 'success' : 'default'}>{value === 1 ? '启用' : '停用'}</Tag>,
                  },
                  {
                    title: '操作',
                    width: 120,
                    render: (_, record) => (
                      <Space wrap>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          loading={forbiddenWordDetailRequest.loading}
                          onClick={() => void openWordEditor(record)}
                        >
                          编辑
                        </Button>
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          loading={deleteForbiddenWordRequest.loading}
                          onClick={() => {
                            modal.confirm({
                              title: '确认删除敏感词？',
                              content: record.word,
                              okText: '删除',
                              okButtonProps: { danger: true },
                              cancelText: '取消',
                              onOk: async () => {
                                try {
                                  await deleteForbiddenWordRequest.run(record.id);
                                  message.success('敏感词已删除');
                                  await forbiddenWordsRequest.refresh();
                                } catch (error) {
                                  message.error(error instanceof Error ? error.message : '删除失败');
                                }
                              },
                            });
                          }}
                        >
                          删除
                        </Button>
                      </Space>
                    ),
                  },
                ]}
              />
            </ProCard>
          </Space>
        ) : null}

        {tab === 'users' ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div className="turtle-page-toolbar turtle-page-toolbar-with-tabs">
              {usersError ? (
                <Alert type="error" showIcon message="用户列表加载失败" description={usersError.message} />
              ) : null}
            </div>

            <ProCard style={panelStyle}>
              <Table
                rowKey="id"
                loading={usersRequest.loading}
                pagination={false}
                dataSource={usersRequest.data?.data || []}
                columns={[
                  { title: 'ID', dataIndex: 'id', width: 80 },
                  {
                    title: '用户',
                    render: (_, record) => (
                      <Space direction="vertical" size={2}>
                        <Typography.Text strong>{record.nickname || record.username || `用户 ${record.id}`}</Typography.Text>
                        <Typography.Text type="secondary">{record.email || '-'}</Typography.Text>
                      </Space>
                    ),
                  },
                  {
                    title: '状态',
                    width: 140,
                    render: (_, record) => (
                      <Space wrap>
                        {record.forbiddenDays ? <Tag color="error">已禁言</Tag> : <Tag color="success">正常</Tag>}
                        {String(record.raw.role || '').includes('admin') ? (
                          <Tag color="processing">管理员</Tag>
                        ) : null}
                      </Space>
                    ),
                  },
                  {
                    title: '操作',
                    width: 420,
                    render: (_, record) => (
                      <Space wrap>
                        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => openMintModal(record)}>
                          发币
                        </Button>
                        <Button
                          size="small"
                          icon={<StopOutlined />}
                          loading={forbiddenUserRequest.loading}
                          onClick={() => void handleMuteUser(record.id, 7)}
                        >
                          禁言 7 天
                        </Button>
                        <Button
                          size="small"
                          icon={<UndoOutlined />}
                          loading={forbiddenUserRequest.loading}
                          onClick={() => void handleMuteUser(record.id, 0)}
                        >
                          解禁
                        </Button>
                        <Button
                          size="small"
                          icon={<CrownOutlined />}
                          loading={grantAdminRequest.loading}
                          onClick={async () => {
                            try {
                              await grantAdminRequest.run({ userId: record.id });
                              message.success('管理员授权成功');
                              await usersRequest.refresh();
                            } catch (error) {
                              message.error(error instanceof Error ? error.message : '授权失败');
                            }
                          }}
                        >
                          授权管理员
                        </Button>
                        <Button
                          size="small"
                          loading={revokeAdminRequest.loading}
                          onClick={async () => {
                            try {
                              await revokeAdminRequest.run({ userId: record.id });
                              message.success('管理员权限已取消');
                              await usersRequest.refresh();
                            } catch (error) {
                              message.error(error instanceof Error ? error.message : '取消失败');
                            }
                          }}
                        >
                          取消管理员
                        </Button>
                      </Space>
                    ),
                  },
                ]}
              />
            </ProCard>
          </Space>
        ) : null}
      </Space>

      <Modal
        open={Boolean(mintModalUser)}
        title={mintModalUser ? `给 ${mintModalUser.nickname || mintModalUser.username || `用户 ${mintModalUser.id}`} 发币` : '发币'}
        okText="确认发币"
        cancelText="取消"
        confirmLoading={mintCoinsRequest.loading}
        onOk={() => void handleMintCoins()}
        onCancel={closeMintModal}
        destroyOnHidden
      >
        <Form form={mintForm} layout="vertical">
          <Form.Item
            label="发放数量"
            name="amount"
            rules={[
              { required: true, message: '请输入发币数量' },
              { type: 'number', min: 1, message: '发币数量必须大于 0' },
            ]}
          >
            <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="请输入整数数量" />
          </Form.Item>

          <Form.Item label="备注" name="remark">
            <Input.TextArea rows={3} maxLength={200} placeholder="选填，例如：活动奖励、人工补偿" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={Boolean(editingWord)}
        title="编辑敏感词"
        okText="保存"
        cancelText="取消"
        confirmLoading={updateForbiddenWordRequest.loading}
        onOk={() => void handleUpdateWord()}
        onCancel={() => {
          setEditingWord(null);
          editWordForm.resetFields();
        }}
        destroyOnHidden
      >
        <Form form={editWordForm} layout="vertical">
          <Form.Item
            label="敏感词"
            name="word"
            rules={[{ required: true, message: '请输入敏感词' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
            <Segmented
              block
              options={[
                { label: '启用', value: 1 },
                { label: '停用', value: 0 },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={Boolean(activeReport)}
        title="举报详情"
        footer={null}
        onCancel={() => setActiveReport(null)}
        destroyOnHidden
      >
        {activeReport ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Alert
              type={activeReport.auditStatus === 0 ? 'warning' : 'success'}
              showIcon
              message={activeReport.auditStatus === 0 ? '待处理举报' : '已处理举报'}
              description={activeReport.reason || '暂无举报原因'}
            />
            <Typography.Text>举报ID: {activeReport.id}</Typography.Text>
            <Typography.Text>对象类型: {activeReport.dataType || '-'}</Typography.Text>
            <Typography.Text>对象ID: {activeReport.dataId || '-'}</Typography.Text>
            <Typography.Text>举报用户: {activeReport.userName || '-'}</Typography.Text>
            <Typography.Text>处理备注: {activeReport.auditRemark || '-'}</Typography.Text>
            <Space wrap>
              <Button
                type="primary"
                loading={updateReportRequest.loading}
                onClick={async () => {
                  await handleAuditReport(activeReport.id, 1);
                  setActiveReport(null);
                }}
              >
                审核通过
              </Button>
              <Button
                loading={updateReportRequest.loading}
                onClick={async () => {
                  await handleAuditReport(activeReport.id, 2);
                  setActiveReport(null);
                }}
              >
                驳回
              </Button>
            </Space>
          </Space>
        ) : null}
      </Modal>
    </PageContainer>
  );
}
