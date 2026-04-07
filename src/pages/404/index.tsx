import { Result } from 'antd';
import { history, useIntl } from '@umijs/max';

export default function NotFoundPage() {
  const intl = useIntl();

  return (
    <Result
      status="404"
      title="404"
      subTitle={intl.formatMessage({ id: 'exception.404' })}
      extra={<a onClick={() => history.push('/')}>Back to Dashboard</a>}
    />
  );
}
