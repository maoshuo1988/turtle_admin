import { Result } from 'antd';
import { history, useIntl } from '@umijs/max';

export default function ForbiddenPage() {
  const intl = useIntl();

  return (
    <Result
      status="403"
      title="403"
      subTitle={intl.formatMessage({ id: 'exception.403' })}
      extra={
        <a onClick={() => history.push('/')}>Back to Dashboard</a>
      }
    />
  );
}
