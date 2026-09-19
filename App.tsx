import React, { useState, useCallback, useRef, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Share2,
  Copy,
  Check,
  Download,
  FileCode2,
  Sparkles,
  Globe,
  Wifi,
  Utensils,
  Link2,
  Mail,
  Palette,
  Sliders,
  Type,
  Smartphone,
  Send,
  ExternalLink,
  X,
  Layers,
  Building2,
  CheckCircle2,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import {
  PREDEFINED_COLORS,
  ICON_OPTIONS,
  QRConfig,
  BorderThemeId,
} from './types';
import { getBorderThemeById } from './borderThemes';
import { ThemedQRPoster } from './components/ThemedQRPoster';
import { BorderThemeSelector } from './components/BorderThemeSelector';
import { drawThemeDecorationsOnCanvas } from './borderCanvasRenderer';

const App: React.FC = () => {
  // Core QR parameters
  const [config, setConfig] = useState<QRConfig>({
    content: 'https://meenatechnologies.com',
    title: 'Scan to Connect with Us',
    centerText: '',
    centerIcon: 'none',
    color: '#1d4ed8',
    bgColor: '#ffffff',
    size: 512,
    margin: 3,
    exportScale: 2,
    borderTheme: 'birthday',
    enable3DTilt: true,
    enableAnimations: true,
    frameBannerText: '🎉 CELEBRATE WITH US 🎉',
  });

  const [activePreset, setActivePreset] = useState<string>('');
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'preview'>('editor');
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isSharingNative, setIsSharingNative] = useState<boolean>(false);

  const qrRef = useRef<SVGSVGElement>(null);

  // Restore configuration from URL hash if shared
  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash.startsWith('#config=')) {
        const encoded = hash.replace('#config=', '');
        const decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))));
        if (decoded && decoded.content) {
          setConfig(decoded);
        }
      }
    } catch (e) {
      console.warn('Could not parse shared configuration:', e);
    }
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]:
        name === 'exportScale' || name === 'margin' || name === 'size'
          ? Number(value)
          : name === 'centerText'
          ? value.slice(0, 5)
          : value,
    }));
  };

  const getBadgeSymbol = (iconVal: string, fallbackText: string): string => {
    switch (iconVal) {
      case 'none':
        return '';
      case 'text':
        return fallbackText || 'QR';
      case 'globe':
        return '🌐';
      case 'link':
        return '🔗';
      case 'wifi':
        return '📶';
      case 'mail':
        return '✉️';
      case 'food':
        return '🍽️';
      case 'shop':
        return '🛍️';
      case 'star':
        return '⭐';
      default:
        return fallbackText || '';
    }
  };

  const applyPreset = (presetName: string) => {
    setActivePreset(presetName);
    switch (presetName) {
      case 'minimal':
        setConfig((prev) => ({
          ...prev,
          title: 'Official QR Code',
          color: '#0f172a',
          bgColor: '#ffffff',
          centerIcon: 'none',
          centerText: '',
          margin: 2,
        }));
        break;
      case 'cobalt':
        setConfig((prev) => ({
          ...prev,
          title: 'Scan to Connect',
          color: '#1d4ed8',
          bgColor: '#ffffff',
          centerIcon: 'globe',
          centerText: 'VISIT',
          margin: 3,
        }));
        break;
      case 'restaurant':
        setConfig((prev) => ({
          ...prev,
          title: 'Digital Menu & Ordering',
          color: '#0f766e',
          bgColor: '#ffffff',
          centerIcon: 'food',
          centerText: 'MENU',
          margin: 3,
        }));
        break;
      case 'wifi':
        setConfig((prev) => ({
          ...prev,
          title: 'Connect to Wi-Fi Network',
          color: '#475569',
          bgColor: '#ffffff',
          centerIcon: 'wifi',
          centerText: 'WIFI',
          margin: 3,
        }));
        break;
      case 'crimson':
        setConfig((prev) => ({
          ...prev,
          title: 'Special Promotion & Offers',
          color: '#be123c',
          bgColor: '#ffffff',
          centerIcon: 'star',
          centerText: 'DEAL',
          margin: 3,
        }));
        break;
      default:
        break;
    }
  };

  const handleSelectBorderTheme = (themeId: BorderThemeId) => {
    const theme = getBorderThemeById(themeId);
    setConfig((prev) => ({
      ...prev,
      borderTheme: themeId,
      color: theme.defaultColor,
      bgColor: theme.defaultBg,
      centerIcon: theme.defaultCenterIcon,
      title: prev.title || theme.defaultTitle,
      frameBannerText: theme.bannerText,
    }));
  };

  /**
   * Generates crisp export canvas with frame, badge decal, and custom title
   */
  const renderStudioCanvas = useCallback((): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      if (!qrRef.current || !config.content) return reject(new Error('No content'));

      const svg = qrRef.current;
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));

      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        const scale = config.exportScale || 2;
        const qrSize = 500 * scale;
        const cardPadding = 48 * scale;
        const cardWidth = qrSize + cardPadding * 2;
        const cardHeight = qrSize + cardPadding * 2;

        const framePaddingX = 36 * scale;
        const hasBanner = Boolean(config.frameBannerText || config.borderTheme !== 'classic');
        const framePaddingTop = (hasBanner ? 56 : 36) * scale;
        // Title Caption
        const footerHeight = config.title.trim() ? 80 * scale : 44 * scale;

        canvas.width = cardWidth + framePaddingX * 2;
        canvas.height = cardHeight + framePaddingTop + footerHeight;

        // Outer Poster Frame
        ctx.fillStyle = config.color;
        const frameRadius = 28 * scale;
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, frameRadius);
        ctx.fill();

        // Inner White Card
        ctx.fillStyle = config.bgColor || '#ffffff';
        const cardX = framePaddingX;
        const cardY = framePaddingTop;
        const cardRadius = 20 * scale;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardWidth, cardHeight, cardRadius);
        ctx.fill();

        // QR Code drawing
        ctx.drawImage(img, cardX + cardPadding, cardY + cardPadding, qrSize, qrSize);

        // Center Emblem Decal
        const activeBadgeValue = getBadgeSymbol(config.centerIcon, config.centerText);
        if (config.centerIcon !== 'none' && activeBadgeValue) {
          const badgeSize = Math.min(qrSize * 0.24, 110 * scale);
          const bx = cardX + cardPadding + (qrSize - badgeSize) / 2;
          const by = cardY + cardPadding + (qrSize - badgeSize) / 2;

          ctx.fillStyle = config.color;
          ctx.beginPath();
          ctx.roundRect(bx, by, badgeSize, badgeSize, 14 * scale);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4 * scale;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const fontSize = Math.min(34 * scale, (badgeSize / Math.max(1, activeBadgeValue.length)) * 1.45);
          ctx.font = `bold ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
          ctx.fillText(activeBadgeValue, bx + badgeSize / 2, by + badgeSize / 2);
        }

        // Draw Themed Border Decorations (Balloons, Confetti, Laurels, HUD brackets, etc.)
        drawThemeDecorationsOnCanvas(ctx, config, {
          width: canvas.width,
          height: canvas.height,
          cardX,
          cardY,
          cardWidth,
          cardHeight,
          scale,
        });

        // Title Caption
        if (config.title.trim()) {
          ctx.fillStyle = '#ffffff';
          const fontSize = 38 * scale;
          ctx.font = `600 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const titleY = cardY + cardHeight + footerHeight / 2;
          ctx.fillText(config.title, canvas.width / 2, titleY);
        }

        URL.revokeObjectURL(url);
        resolve(canvas);
      };

      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  }, [config]);

  const downloadPNG = async () => {
    if (!config.content.trim()) return;
    try {
      setIsDownloading(true);
      const canvas = await renderStudioCanvas();
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      const safeName = (config.title || 'qrcode').toLowerCase().replace(/[^a-z0-9]/g, '-');
      downloadLink.download = `${safeName}-${config.exportScale}x.png`;
      downloadLink.href = pngUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadSVG = () => {
    if (!qrRef.current || !config.content.trim()) return;
    const svgElement = qrRef.current;
    const clone = svgElement.cloneNode(true) as SVGSVGElement;

    // Embed matching responsive emblem decal into SVG export
    const activeBadgeValue = getBadgeSymbol(config.centerIcon, config.centerText);
    if (config.centerIcon !== 'none' && activeBadgeValue) {
      const viewBox = clone.viewBox?.baseVal;
      const svgWidth = viewBox && viewBox.width > 0 ? viewBox.width : parseFloat(clone.getAttribute('width') || '220');
      const svgHeight = viewBox && viewBox.height > 0 ? viewBox.height : parseFloat(clone.getAttribute('height') || '220');

      const badgeSize = Math.min(svgWidth * 0.22, 48);
      const bx = (svgWidth - badgeSize) / 2;
      const by = (svgHeight - badgeSize) / 2;
      const rx = 10;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', String(bx));
      rect.setAttribute('y', String(by));
      rect.setAttribute('width', String(badgeSize));
      rect.setAttribute('height', String(badgeSize));
      rect.setAttribute('rx', String(rx));
      rect.setAttribute('fill', config.color);
      rect.setAttribute('stroke', '#ffffff');
      rect.setAttribute('stroke-width', '2.5');
      clone.appendChild(rect);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(bx + badgeSize / 2));
      text.setAttribute('y', String(by + badgeSize / 2 + 1));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', '#ffffff');
      const fontSize = Math.min(16, (badgeSize / Math.max(1, activeBadgeValue.length)) * 1.4);
      text.setAttribute('font-size', String(fontSize));
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('font-family', "'Plus Jakarta Sans', sans-serif");
      text.textContent = activeBadgeValue;
      clone.appendChild(text);
    }

    const svgString = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    const safeName = (config.title || 'qrcode').toLowerCase().replace(/[^a-z0-9]/g, '-');
    downloadLink.download = `${safeName}.svg`;
    downloadLink.href = url;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  };

  const copyImage = async () => {
    if (!config.content.trim()) return;
    try {
      const canvas = await renderStudioCanvas();
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 2000);
        } catch (err) {
          console.error('Failed to copy to clipboard:', err);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Canvas render failure:', err);
    }
  };

  // Generate shareable link encoded with current design parameters
  const getShareableStudioLink = (): string => {
    try {
      const serialized = btoa(unescape(encodeURIComponent(JSON.stringify(config))));
      const baseUrl = window.location.href.split('#')[0];
      return `${baseUrl}#config=${serialized}`;
    } catch (e) {
      return window.location.href;
    }
  };

  const copyShareableLink = () => {
    const link = getShareableStudioLink();
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyDestinationUrl = () => {
    if (!config.content.trim()) return;
    navigator.clipboard.writeText(config.content);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Native Web Share execution (AirDrop, Messages, Android Share, System Tray)
  const triggerNativeShare = async () => {
    if (!config.content.trim()) return;
    setIsSharingNative(true);
    try {
      const canvas = await renderStudioCanvas();
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const safeName = (config.title || 'qrcode').toLowerCase().replace(/[^a-z0-9]/g, '-');
        const file = new File([blob], `${safeName}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: config.title || 'My QR Code',
            text: `Scan this QR Code for: ${config.content} (Meena Technologies)`,
            files: [file],
          });
        } else if (navigator.share) {
          await navigator.share({
            title: config.title || 'My QR Code',
            text: `Scan this QR Code for: ${config.content}`,
            url: config.content,
          });
        } else {
          setIsShareModalOpen(true);
        }
      }, 'image/png');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share error:', err);
        setIsShareModalOpen(true);
      }
    } finally {
      setIsSharingNative(false);
    }
  };

  // Social share URLs
  const encodedContent = encodeURIComponent(config.content);
  const shareText = encodeURIComponent(
    config.title
      ? `Scan "${config.title}": ${config.content} • Generated via Meena Technologies`
      : `Scan this QR code: ${config.content}`
  );
  const shareLinks = {
    whatsapp: `https://api.whatsapp.com/send?text=${shareText}`,
    telegram: `https://t.me/share/url?url=${encodedContent}&text=${encodeURIComponent(config.title || 'QR Code')}`,
    twitter: `https://twitter.com/intent/tweet?text=${shareText}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedContent}`,
    email: `mailto:?subject=${encodeURIComponent(config.title || 'QR Code')}&body=${shareText}`,
  };

  const activeBadge = getBadgeSymbol(config.centerIcon, config.centerText);

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col items-center">
      {/* Top Header & Brand Bar */}
      <header className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Venture Badge */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">
                QR Code Generator
              </h1>
              <div className="flex items-center gap-1 text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                <Building2 className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="truncate">A venture by <strong className="text-slate-700 font-semibold">Meena Technologies</strong></span>
              </div>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => setIsShareModalOpen(true)}
              disabled={!config.content.trim()}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs tracking-wide transition shadow-xs active:scale-95 disabled:opacity-40 min-h-[40px] sm:min-h-[42px]"
              id="header-share-btn"
              title="Share QR Code"
            >
              <Share2 className="w-4 h-4 text-indigo-600" strokeWidth={2} />
              <span className="hidden sm:inline">Share</span>
            </button>

            <button
              onClick={copyImage}
              disabled={!config.content.trim()}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs tracking-wide transition shadow-xs active:scale-95 disabled:opacity-40 min-h-[40px] sm:min-h-[42px]"
              id="header-copy-btn"
              title="Copy to Clipboard"
            >
              {copiedImage ? (
                <Check className="w-4 h-4 text-emerald-600" strokeWidth={2.5} />
              ) : (
                <Copy className="w-4 h-4 text-slate-500" strokeWidth={2} />
              )}
              <span>{copiedImage ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={downloadSVG}
              disabled={!config.content.trim()}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs tracking-wide transition shadow-xs active:scale-95 disabled:opacity-40 min-h-[40px] sm:min-h-[42px]"
              id="header-svg-btn"
              title="Download Vector SVG"
            >
              <FileCode2 className="w-4 h-4 text-slate-500" strokeWidth={2} />
              <span>SVG</span>
            </button>

            <button
              onClick={downloadPNG}
              disabled={isDownloading || !config.content.trim()}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs tracking-wide transition shadow-sm active:scale-95 disabled:opacity-40 min-h-[40px] sm:min-h-[42px]"
              id="header-png-btn"
              title="Download PNG Image"
            >
              <Download className="w-4 h-4 text-white" strokeWidth={2} />
              <span className="hidden xs:inline sm:inline">Download</span>
              <span className="inline xs:hidden sm:hidden">PNG</span>
              <span className="hidden sm:inline">PNG</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Tab Switcher (Visible only on screens < lg) */}
      <div className="w-full max-w-6xl mx-auto px-4 pt-4 lg:hidden">
        <div className="bg-slate-200/80 p-1 rounded-xl flex gap-1 shadow-inner">
          <button
            onClick={() => setActiveMobileTab('editor')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition min-h-[44px] ${
              activeMobileTab === 'editor'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            id="mobile-tab-editor"
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <span>Customize Design</span>
          </button>
          <button
            onClick={() => setActiveMobileTab('preview')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition min-h-[44px] ${
              activeMobileTab === 'preview'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            id="mobile-tab-preview"
          >
            <Eye className="w-4 h-4 text-indigo-600" />
            <span>Live Preview & Save</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Container */}
      <main className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Form: Configurator */}
          <div className={`lg:col-span-7 space-y-5 sm:space-y-6 ${activeMobileTab === 'editor' ? 'block' : 'hidden lg:block'}`}>
            
            {/* Section 1: Target Destination & Title */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Link2 className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">Content & Header</h2>
                </div>
                <span className="text-[11px] font-medium text-slate-400">Step 1</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="content">
                  Target Destination (URL or Text)
                </label>
                <div className="relative">
                  <input
                    id="content"
                    name="content"
                    type="text"
                    value={config.content}
                    onChange={handleInputChange}
                    className="w-full pl-3.5 pr-10 py-3 sm:py-2.5 text-base sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition font-mono text-slate-800 min-h-[44px]"
                    placeholder="https://yourwebsite.com"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="title">
                  Poster Label Caption <span className="text-slate-400 font-normal">(Optional bottom label)</span>
                </label>
                <div className="relative">
                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={config.title}
                    onChange={handleInputChange}
                    className="w-full pl-3.5 pr-10 py-3 sm:py-2.5 text-base sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition text-slate-800 font-medium min-h-[44px]"
                    placeholder="e.g. Scan to Connect with Us"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Type className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Occasion & Border Themes (3D & Animated) */}
            <BorderThemeSelector
              config={config}
              onSelectTheme={handleSelectBorderTheme}
              onUpdateConfig={(patch) => setConfig((prev) => ({ ...prev, ...patch }))}
            />

            {/* Section 3: Palette & Frame Customization */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Palette className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">Color Palette</h2>
                </div>
                <span className="text-[11px] font-mono text-slate-500 uppercase">{config.color}</span>
              </div>

              <div className="flex flex-wrap gap-2.5 sm:gap-3 items-center">
                {PREDEFINED_COLORS.map((col) => (
                  <button
                    key={col.value}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, color: col.value }))}
                    className={`w-9 h-9 sm:w-8 sm:h-8 rounded-full border-2 transition relative flex items-center justify-center active:scale-95 ${
                      config.color.toLowerCase() === col.value.toLowerCase()
                        ? 'border-slate-900 scale-110 shadow-xs ring-2 ring-slate-200'
                        : 'border-white hover:scale-105'
                    }`}
                    style={{ backgroundColor: col.value }}
                    title={col.name}
                  >
                    {config.color.toLowerCase() === col.value.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    )}
                  </button>
                ))}

                <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200 min-h-[44px]">
                  <input
                    type="color"
                    id="customColor"
                    name="color"
                    value={config.color}
                    onChange={handleInputChange}
                    className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg cursor-pointer border border-slate-200 p-0.5 bg-white shrink-0"
                  />
                  <label htmlFor="customColor" className="text-xs font-mono font-medium text-slate-600">
                    Custom Hex
                  </label>
                </div>
              </div>
            </div>

            {/* Section 4: Center Emblem & Decal */}
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Sliders className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">Center Badge & Quality</h2>
                </div>
                <span className="text-[11px] font-medium text-slate-400">Decal & Margin</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="centerIcon">
                    Center Emblem Symbol
                  </label>
                  <select
                    id="centerIcon"
                    name="centerIcon"
                    value={config.centerIcon}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-3 sm:py-2.5 text-base sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition text-slate-700 font-medium min-h-[44px]"
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.symbol ? `${opt.symbol} ${opt.label}` : opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {config.centerIcon === 'text' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="centerText">
                      Monogram (Max 5 letters)
                    </label>
                    <input
                      id="centerText"
                      name="centerText"
                      type="text"
                      maxLength={5}
                      value={config.centerText}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-3 sm:py-2.5 text-base sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition font-mono uppercase text-slate-800 min-h-[44px]"
                      placeholder="e.g. VIP, APP"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="margin">
                      Quiet Zone Margin
                    </label>
                    <select
                      id="margin"
                      name="margin"
                      value={config.margin}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-3 sm:py-2.5 text-base sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition text-slate-700 font-medium min-h-[44px]"
                    >
                      <option value={1}>Compact (1 border unit)</option>
                      <option value={2}>Standard (2 border units)</option>
                      <option value={3}>Clean (3 border units)</option>
                      <option value={5}>Spacious (5 border units)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="exportScale">
                    Export Resolution
                  </label>
                  <select
                    id="exportScale"
                    name="exportScale"
                    value={config.exportScale}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-3 sm:py-2.5 text-base sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition text-slate-700 font-medium min-h-[44px]"
                  >
                    <option value={1}>1x — Web Display (~700px)</option>
                    <option value={2}>2x — High-DPI Retina (~1400px)</option>
                    <option value={4}>4x — Ultra-HD Print (~2800px)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-[11px] text-slate-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Compliant with standard optical QR readers</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Action to Switch to Preview */}
            <div className="lg:hidden pt-2">
              <button
                onClick={() => setActiveMobileTab('preview')}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-98 transition min-h-[48px]"
              >
                <Eye className="w-4 h-4" />
                <span>View Live Poster & Export</span>
              </button>
            </div>

          </div>

          {/* Right Side: Live Visual Preview */}
          <div className={`lg:col-span-5 flex flex-col items-center w-full ${activeMobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-24 w-full flex flex-col items-center">
              
              <div className="w-full flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Live Poster Preview
                </span>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {config.exportScale}x Scale
                </span>
              </div>

              {/* Interactive Themed 3D QR Poster Preview */}
              <ThemedQRPoster
                config={config}
                activeBadge={activeBadge}
                qrRef={qrRef}
                onToggle3D={() => setConfig((prev) => ({ ...prev, enable3DTilt: !prev.enable3DTilt }))}
              />

              {/* Action Buttons Below Card */}
              <div className="w-full max-w-sm mt-4 grid grid-cols-3 gap-2">
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  disabled={!config.content.trim()}
                  className="py-3 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition shadow-xs active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[44px]"
                  id="preview-share-btn"
                >
                  <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Share</span>
                </button>

                <button
                  onClick={downloadPNG}
                  disabled={isDownloading || !config.content.trim()}
                  className="py-3 px-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition shadow-sm active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[44px]"
                  id="preview-png-btn"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG</span>
                </button>

                <button
                  onClick={downloadSVG}
                  disabled={!config.content.trim()}
                  className="py-3 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition shadow-xs active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[44px]"
                  id="preview-svg-btn"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>SVG</span>
                </button>
              </div>

              {/* Mobile Back to Editor button */}
              <div className="w-full max-w-sm mt-3 lg:hidden">
                <button
                  onClick={() => setActiveMobileTab('editor')}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition min-h-[44px]"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                  <span>Back to Customize</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Sleek Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white py-6 mt-8 sm:mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>A venture by <strong className="text-slate-800 font-semibold">Meena Technologies</strong></span>
          </div>

          <p className="text-slate-400 text-center">
            Enterprise QR Generation & Vector Engine
          </p>
        </div>
      </footer>

      {/* CLEAN SHARE MODAL */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 relative max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Title */}
            <div className="flex items-center gap-3 mb-4 sm:mb-5 pr-8">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">Share QR Code</h3>
                <p className="text-xs text-slate-500 font-medium truncate">
                  A venture by Meena Technologies
                </p>
              </div>
            </div>

            {/* Target Snippet */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-4 sm:mb-5 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 p-0.5"
                style={{ backgroundColor: config.color }}
              >
                <div className="w-full h-full bg-white rounded-md flex items-center justify-center">
                  <QrCode className="w-5 h-5" style={{ color: config.color }} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {config.title || 'QR Code Poster'}
                </p>
                <p className="text-[11px] text-slate-500 truncate font-mono">
                  {config.content}
                </p>
              </div>
            </div>

            {/* Native Mobile Share Sheet */}
            <button
              onClick={triggerNativeShare}
              disabled={isSharingNative}
              className="w-full mb-4 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-98 transition min-h-[44px]"
            >
              <Smartphone className="w-4 h-4" />
              <span>Share via Device Sheet (AirDrop / Nearby)</span>
            </button>

            {/* Social Share Grid */}
            <div className="mb-4 sm:mb-5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Send to Apps
              </label>
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                <a
                  href={shareLinks.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/70 hover:bg-emerald-100/90 text-emerald-700 transition min-h-[44px]"
                  title="Share to WhatsApp"
                >
                  <Send className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] font-bold truncate">WhatsApp</span>
                </a>

                <a
                  href={shareLinks.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border border-sky-100 bg-sky-50/70 hover:bg-sky-100/90 text-sky-700 transition min-h-[44px]"
                  title="Share to Telegram"
                >
                  <Send className="w-4 h-4 mb-0.5 -rotate-45" />
                  <span className="text-[10px] font-bold truncate">Telegram</span>
                </a>

                <a
                  href={shareLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-slate-100/80 hover:bg-slate-200 text-slate-800 transition min-h-[44px]"
                  title="Share to X"
                >
                  <ExternalLink className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] font-bold truncate">X Post</span>
                </a>

                <a
                  href={shareLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border border-blue-100 bg-blue-50/70 hover:bg-blue-100/90 text-blue-700 transition min-h-[44px]"
                  title="Share to LinkedIn"
                >
                  <Globe className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] font-bold truncate">LinkedIn</span>
                </a>

                <a
                  href={shareLinks.email}
                  className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition min-h-[44px]"
                  title="Share via Email"
                >
                  <Mail className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] font-bold truncate">Email</span>
                </a>
              </div>
            </div>

            {/* Quick Copy Rows */}
            <div className="space-y-2 border-t border-slate-100 pt-3 sm:pt-4">
              <button
                onClick={copyImage}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs flex items-center justify-between transition min-h-[42px]"
              >
                <span className="flex items-center gap-2">
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  Copy High-Res Poster Image
                </span>
                <span className="text-indigo-600 font-bold text-[11px]">
                  {copiedImage ? '✓ Copied' : 'Copy'}
                </span>
              </button>

              <button
                onClick={copyShareableLink}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs flex items-center justify-between transition min-h-[42px]"
              >
                <span className="flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-slate-400" />
                  Copy Design Studio Link
                </span>
                <span className="text-indigo-600 font-bold text-[11px]">
                  {copiedLink ? '✓ Copied' : 'Copy'}
                </span>
              </button>

              <button
                onClick={copyDestinationUrl}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs flex items-center justify-between transition min-h-[42px]"
              >
                <span className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  Copy Destination URL
                </span>
                <span className="text-indigo-600 font-bold text-[11px]">
                  {copiedUrl ? '✓ Copied' : 'Copy'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

