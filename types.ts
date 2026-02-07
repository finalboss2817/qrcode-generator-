
export interface QRConfig {
  content: string;
  title: string;
  centerText: string;
  color: string;
  bgColor: string;
  size: number;
  margin: number;
}

export interface ColorOption {
  name: string;
  value: string;
}

export const PREDEFINED_COLORS: ColorOption[] = [
  { name: 'Onyx Black', value: '#000000' },
  { name: 'Royal Blue', value: '#1e40af' },
  { name: 'Forest Green', value: '#064e3b' },
  { name: 'Wine Red', value: '#7f1d1d' },
  { name: 'Deep Purple', value: '#4c1d95' },
  { name: 'Slate Gray', value: '#334155' },
];
