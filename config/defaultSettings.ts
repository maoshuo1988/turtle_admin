import type { Settings as LayoutSettings } from '@ant-design/pro-components';

const defaultSettings: LayoutSettings & { title: string } = {
  title: 'Turtle Admin',
  navTheme: 'light',
  colorPrimary: '#1677ff',
  layout: 'mix',
  contentWidth: 'Fluid',
  fixedHeader: true,
  fixSiderbar: true,
  splitMenus: false,
};

export default defaultSettings;
