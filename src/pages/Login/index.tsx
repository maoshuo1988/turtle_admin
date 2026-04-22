import { ProCard, ProForm, ProFormText } from '@ant-design/pro-components';
import { LockOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons';
import { history, useIntl, useLocation, useModel } from '@umijs/max';
import { App, Button, Form, Input, Typography } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRequestImageCaptcha, useRequestSignIn } from '@/hooks/useRequest';
import type { AppInitialState } from '@/types/runtime';
import { LOGIN_PATH } from '@/utils/auth';
import { normalizeCaptchaImage } from '@/utils/captcha';
import styles from './index.module.scss';

interface LoginFormValues {
  account: string;
  password: string;
  captchaCode: string;
}

export default function LoginPage() {
  const intl = useIntl();
  const location = useLocation();
  const { message } = App.useApp();
  const { initialState, setInitialState } = useModel('@@initialState');
  const appState = initialState as AppInitialState | undefined;
  const [form] = Form.useForm<LoginFormValues>();
  const { run: runSignIn, loading: signInLoading } = useRequestSignIn();
  const { run: runImageCaptcha } = useRequestImageCaptcha();
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const redirectTarget = useMemo(() => {
    const redirect = new URLSearchParams(location.search).get('redirect');

    if (!redirect || redirect === LOGIN_PATH || redirect.startsWith(`${LOGIN_PATH}?`)) {
      return '/';
    }

    return redirect;
  }, [location.search]);

  const loadCaptcha = useCallback(async (silent = false) => {
    setCaptchaLoading(true);
    try {
      const response = await runImageCaptcha();
      setCaptchaId(response.captchaId);
      setCaptchaImage(normalizeCaptchaImage(response.captchaBase64));
      form.setFieldValue('captchaCode', '');
    } catch (error) {
      if (!silent) {
        message.error(error instanceof Error ? error.message : '验证码加载失败');
      }
    } finally {
      setCaptchaLoading(false);
    }
  }, [form, message, runImageCaptcha]);

  useEffect(() => {
    void loadCaptcha(true);
  }, [loadCaptcha]);

  useEffect(() => {
    if (appState?.currentUser) {
      history.replace(redirectTarget);
    }
  }, [appState?.currentUser, redirectTarget]);

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <ProCard bordered className={styles.card}>
          <Typography.Title level={3} style={{ marginTop: 0 }}>
            {intl.formatMessage({ id: 'login.title' })}
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            {intl.formatMessage({ id: 'login.subtitle' })}
          </Typography.Paragraph>

          <ProForm<LoginFormValues>
            form={form}
            layout="vertical"
            submitter={{
              searchConfig: {
                submitText: intl.formatMessage({ id: 'login.submit' }),
              },
              submitButtonProps: {
                size: 'large',
                block: true,
              },
              resetButtonProps: false,
            }}
            onFinish={async (values) => {
              if (!captchaId) {
                await loadCaptcha();
                return false;
              }

              try {
                const result = await runSignIn({
                  account: values.account,
                  password: values.password,
                  captchaCode: values.captchaCode,
                  captchaId,
                  captchaProtocol: 3,
                });

                const currentUser = appState?.fetchUserInfo
                  ? await appState.fetchUserInfo()
                  : result.currentUser;

                await setInitialState((state) => ({
                  ...(state as AppInitialState),
                  currentUser: currentUser || result.currentUser,
                }));

                message.success(intl.formatMessage({ id: 'login.success' }));
                return true;
              } catch (error) {
                message.error(error instanceof Error ? error.message : '登录失败');
                await loadCaptcha(true);
                return false;
              }
            }}
          loading={signInLoading}
          >
            <ProFormText
              name="account"
              fieldProps={{
                size: 'large',
                prefix: <UserOutlined />,
              }}
              placeholder={intl.formatMessage({ id: 'login.account' })}
              rules={[{ required: true }]}
            />

            <ProFormText.Password
              name="password"
              fieldProps={{
                size: 'large',
                prefix: <LockOutlined />,
              }}
              placeholder={intl.formatMessage({ id: 'login.password' })}
              rules={[{ required: true }]}
            />

            <Form.Item
              name="captchaCode"
              rules={[{ required: true, message: intl.formatMessage({ id: 'login.captcha.required' }) }]}
            >
              <div className={styles.captchaRow}>
                <Input
                  size="large"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder={intl.formatMessage({ id: 'login.captcha.placeholder' })}
                />

                <div className={styles.captchaImageBox}>
                  {captchaImage ? (
                    <img alt="captcha" className={styles.captchaImage} src={captchaImage} />
                  ) : (
                    <span className={styles.captchaFallback}>
                      {captchaLoading
                        ? intl.formatMessage({ id: 'login.captcha.loading' })
                        : intl.formatMessage({ id: 'login.captcha.loadError' })}
                    </span>
                  )}
                </div>

                <Button
                  icon={<ReloadOutlined />}
                  loading={captchaLoading}
                  onClick={() => {
                    void loadCaptcha();
                  }}
                  size="large"
                >
                  {intl.formatMessage({ id: 'login.captcha.refresh' })}
                </Button>
              </div>
            </Form.Item>
          </ProForm>
        </ProCard>
      </div>
    </div>
  );
}
