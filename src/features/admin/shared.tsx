import type { CSSProperties, ReactNode } from 'react';
import { Empty, Space, Typography } from 'antd';
import type {
  BtlStatus,
  MktStatus,
  TrendPoint,
} from '@/data/admin_mock_data';

export const panelStyle: CSSProperties = {
  borderRadius: 16,
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
};

export const mutedTextStyle: CSSProperties = {
  color: '#667085',
  fontSize: 12,
};

export function fmtNum(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function fmtDate(ts: number): string {
  if (!ts) {
    return '-';
  }

  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${min}`;
}

export function normalizeTrendDateLabel(rawDate: string): string {
  if (!rawDate) {
    return '-';
  }

  const matched = rawDate.match(/^(\d+)-(\d{2})-(\d{2})$/);
  if (!matched) {
    return rawDate;
  }

  const year = Number(matched[1]);
  const month = matched[2];
  const day = matched[3];

  if (!Number.isFinite(year) || year > 2100) {
    return `${month}-${day}`;
  }

  return `${month}-${day}`;
}

export function getMarketStatusColor(status: MktStatus) {
  return {
    OPEN: 'processing',
    CLOSED: 'warning',
    SETTLED: 'success',
    VOIDED: 'error',
  }[status];
}

export function getBattleStatusColor(status: BtlStatus) {
  return {
    waiting: 'default',
    active: 'processing',
    pending_declare: 'warning',
    pending_confirm: 'warning',
    disputed: 'error',
    resolved: 'success',
    voided: 'default',
  }[status];
}

export function getRiskLevelColor(level: 'high' | 'medium' | 'low') {
  return {
    high: '#ff4d4f',
    medium: '#fa8c16',
    low: '#1677ff',
  }[level];
}

export function MiniBarChart({
  data,
  label,
  color,
}: {
  data: TrendPoint[];
  label: string;
  color: string;
}) {
  if (!data.length) {
    return (
      <div>
        <Typography.Text strong>{label}</Typography.Text>
        <div style={{ marginTop: 16 }}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无趋势数据" />
        </div>
      </div>
    );
  }

  const max = Math.max(...data.map((item) => item.value), 0);
  const denominator = max > 0 ? max : 1;

  return (
    <div>
      <Typography.Text strong>{label}</Typography.Text>
      <div
        style={{
          marginTop: 16,
          height: 160,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 12,
        }}
      >
        {data.map((item) => (
          <div
            key={item.date}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            <Typography.Text style={{ fontSize: 11, color: '#667085' }}>
              {fmtNum(item.value)}
            </Typography.Text>
            <div
              style={{
                width: '100%',
                minHeight: 6,
                height: `${(item.value / denominator) * 100}%`,
                borderRadius: '10px 10px 0 0',
                background: color,
              }}
            />
            <Typography.Text style={{ fontSize: 11, color: '#98a2b3' }}>
              {normalizeTrendDateLabel(item.date)}
            </Typography.Text>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MetricLine({
  label,
  value,
  valueColor,
  icon,
}: {
  label: string;
  value: ReactNode;
  valueColor?: string;
  icon?: ReactNode;
}) {
  return (
    <Space size={6} wrap>
      {icon}
      <Typography.Text style={mutedTextStyle}>{label}</Typography.Text>
      <Typography.Text strong style={{ color: valueColor }}>
        {value}
      </Typography.Text>
    </Space>
  );
}
