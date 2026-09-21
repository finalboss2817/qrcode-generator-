export type BorderThemeId =
  | 'classic'
  | 'birthday'
  | 'wedding'
  | 'cyberpunk'
  | 'vip_gold'
  | 'food_bistro'
  | 'party_fun';

export interface BorderThemeOption {
  id: BorderThemeId;
  name: string;
  category: string;
  tagline: string;
  emoji: string;
  badge: string;
  defaultColor: string;
  defaultBg: string;
  defaultCenterIcon: string;
  defaultTitle: string;
  bannerText: string;
  has3DConfetti?: boolean;
}

export interface QRConfig {
  content: string;
  title: string;
  centerText: string;
  centerIcon: string;
  color: string;
  bgColor: string;
  size: number;
  margin: number;
  exportScale: number;
  borderTheme: BorderThemeId;
  enable3DTilt: boolean;
  enableAnimations: boolean;
  frameBannerText?: string;
  pdfFileName?: string;
  pdfFileSize?: string;
  isDynamic?: boolean;
  uploadedPdfUrl?: string;
  dynamicId?: string;
}

export interface SavedDynamicQR {
  id: string; // unique dynamic ID, e.g. "dyn_abc123"
  userId: string;
  title: string;
  destinationUrl: string; // current redirect target
  config: QRConfig; // full visual theme and settings snapshot
  createdAt: string;
  updatedAt: string;
}

export interface ColorOption {
  name: string;
  value: string;
}

export const PREDEFINED_COLORS: ColorOption[] = [
  { name: 'Onyx Dark', value: '#0f172a' },
  { name: 'Deep Indigo', value: '#3730a3' },
  { name: 'Cobalt Blue', value: '#1d4ed8' },
  { name: 'Teal Forest', value: '#0f766e' },
  { name: 'Emerald', value: '#047857' },
  { name: 'Crimson', value: '#991b1b' },
  { name: 'Rosewood', value: '#be123c' },
  { name: 'Plum Purple', value: '#581c87' },
  { name: 'Slate Gray', value: '#475569' },
];

export interface IconOption {
  id: string;
  label: string;
  symbol: string;
}

export const ICON_OPTIONS: IconOption[] = [
  { id: 'none', label: 'None (Plain)', symbol: '' },
  { id: 'text', label: 'Custom Monogram', symbol: 'Aa' },
  { id: 'globe', label: 'Website / Web', symbol: '🌐' },
  { id: 'link', label: 'Direct Link', symbol: '🔗' },
  { id: 'wifi', label: 'Wi-Fi Network', symbol: '📶' },
  { id: 'mail', label: 'Email Contact', symbol: '✉️' },
  { id: 'food', label: 'Menu & Dining', symbol: '🍽️' },
  { id: 'shop', label: 'Store & Shop', symbol: '🛍️' },
  { id: 'star', label: 'Featured / Star', symbol: '⭐' },
];

