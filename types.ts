
export interface QRConfig {
  content: string;
  title: string;
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
  { name: 'Classic Black', value: '#000000' },
  { name: 'Royal Blue', value: '#1e40af' },
  { name: 'Emerald Green', value: '#065f46' },
  { name: 'Ruby Red', value: '#991b1b' },
  { name: 'Deep Purple', value: '#5b21b6' },
  { name: 'Midnight Indigo', value: '#312e81' },
];
