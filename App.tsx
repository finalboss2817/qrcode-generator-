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
  FileText,
  Upload,
  AlertCircle,
  Trash2,
  User as UserIcon,
  LogIn,
  LogOut,
  Zap,
  UserPlus,
  ShieldCheck,
  FolderOpen,
  Edit3,
  Plus,
  RefreshCw,
  Clock,
  ArrowRight,
} from 'lucide-react';
import {
  PREDEFINED_COLORS,
  ICON_OPTIONS,
  QRConfig,
  SavedDynamicQR,
  BorderThemeId,
} from './types';
import { getBorderThemeById } from './borderThemes';
import { ThemedQRPoster } from './components/ThemedQRPoster';
import { BorderThemeSelector } from './components/BorderThemeSelector';
import { drawThemeDecorationsOnCanvas } from './borderCanvasRenderer';
import { supabase, PDF_STORAGE_BUCKET } from './supabase';
import { AuthModal } from './components/AuthModal';
import { DynamicRedirectView } from './components/DynamicRedirectView';
import {
  saveDynamicQRRecord,
  getDynamicRedirectUrl,
  fetchUserDynamicQRsFromSupabase,
  deleteDynamicQRRecord,
} from './dynamicQRService';
import { User } from '@supabase/supabase-js';

const INITIAL_CONFIG: QRConfig = {
  content: '',
  title: '',
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
  frameBannerText: '',
};

const App: React.FC = () => {
  // Input mode: URL / Text vs PDF Document
  const [inputMode, setInputMode] = useState<'text' | 'pdf'>('text');
  const [pdfUploading, setPdfUploading] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core QR parameters - Start with empty values (no pre-filled text or placeholders)
  const [config, setConfig] = useState<QRConfig>(INITIAL_CONFIG);

  const [activePreset, setActivePreset] = useState<string>('');
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'preview'>('editor');
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isSharingNative, setIsSharingNative] = useState<boolean>(false);

  // Supabase Auth and Pro Access States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authReason, setAuthReason] = useState<string>('');
  const [pdfUploadSuccess, setPdfUploadSuccess] = useState<boolean>(false);

  // Dynamic QR Code States
  const [isEditingDestination, setIsEditingDestination] = useState<boolean>(false);
  const [tempDestination, setTempDestination] = useState<string>('');
  const [destinationUpdateSuccess, setDestinationUpdateSuccess] = useState<string | null>(null);
  const [savedDynamicQRs, setSavedDynamicQRs] = useState<SavedDynamicQR[]>([]);
  const [editingTargetQRId, setEditingTargetQRId] = useState<string | null>(null);
  const [quickEditUrl, setQuickEditUrl] = useState<string>('');
  const [copiedDynamicUrl, setCopiedDynamicUrl] = useState<boolean>(false);

  // Check for dynamic redirect param in URL: ?r=dyn_xxx or pathname /r/dyn_xxx or hash #r=dyn_xxx
  const [redirectId, setRedirectId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const rParam = urlParams.get('r');
    if (rParam) return rParam;

    const path = window.location.pathname;
    if (path.startsWith('/r/')) {
      const seg = path.replace('/r/', '').split('/')[0];
      if (seg) return seg;
    }

    const hash = window.location.hash;
    if (hash.startsWith('#r=')) {
      return hash.replace('#r=', '');
    }

    return null;
  });

  const qrRef = useRef<SVGSVGElement>(null);

  // Helper to get storage key
  const getStorageKey = (userId: string) => `qr_dynamic_codes_${userId}`;

  // Load user's saved dynamic QRs on login or auth change
  useEffect(() => {
    let isMounted = true;
    if (currentUser) {
      // 1. Instant load from local storage
      try {
        const stored = localStorage.getItem(getStorageKey(currentUser.id));
        if (stored) {
          const parsed: SavedDynamicQR[] = JSON.parse(stored);
          setSavedDynamicQRs(parsed);
        } else {
          setSavedDynamicQRs([]);
        }
      } catch (e) {
        console.error('Failed to load saved dynamic QRs from local:', e);
      }

      // 2. Fetch latest from Supabase Database
      fetchUserDynamicQRsFromSupabase(currentUser.id).then((cloudQRs) => {
        if (isMounted && cloudQRs && cloudQRs.length > 0) {
          setSavedDynamicQRs((prev) => {
            // Merge cloud records with any local records
            const merged = [...cloudQRs];
            prev.forEach((localItem) => {
              if (!merged.some((m) => m.id === localItem.id)) {
                merged.push(localItem);
              }
            });
            try {
              localStorage.setItem(getStorageKey(currentUser.id), JSON.stringify(merged));
            } catch (err) {}
            return merged;
          });
        }
      }).catch((err) => {
        console.warn('Supabase initial fetch notice:', err);
      });
    } else {
      setSavedDynamicQRs([]);
    }

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Save or Update dynamic QR function (supports forceNew to create multiple QRs)
  const handleSaveOrUpdateDynamicQR = async (customDestination?: string, forceNew: boolean = false) => {
    if (!currentUser) {
      setAuthReason('Sign up free to save and manage your Dynamic QR codes in your account.');
      setIsAuthModalOpen(true);
      return;
    }

    const targetUrl = (customDestination !== undefined ? customDestination : config.content).trim();
    if (!targetUrl) {
      setPdfError('Please enter a destination URL or text before saving your Dynamic QR.');
      return;
    }

    const dynId = (forceNew || !config.dynamicId)
      ? `dyn_${Math.random().toString(36).substring(2, 9)}`
      : config.dynamicId;

    const qrTitle = config.title.trim() || (forceNew ? `Dynamic QR #${savedDynamicQRs.length + 1}` : 'My Dynamic QR');
    const now = new Date().toISOString();

    const existingIndex = !forceNew ? savedDynamicQRs.findIndex((item) => item.id === dynId) : -1;
    let updatedList: SavedDynamicQR[];

    const newRecord: SavedDynamicQR = {
      id: dynId,
      userId: currentUser.id,
      title: qrTitle,
      destinationUrl: targetUrl,
      config: {
        ...config,
        dynamicId: dynId,
        content: targetUrl,
        isDynamic: true,
      },
      createdAt: existingIndex >= 0 ? savedDynamicQRs[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      updatedList = [...savedDynamicQRs];
      updatedList[existingIndex] = newRecord;
    } else {
      updatedList = [newRecord, ...savedDynamicQRs];
    }

    setSavedDynamicQRs(updatedList);

    // Save to LocalStorage immediately
    try {
      localStorage.setItem(getStorageKey(currentUser.id), JSON.stringify(updatedList));
    } catch (e) {
      console.warn('LocalStorage save notice:', e);
    }

    // Save to Supabase Database
    await saveDynamicQRRecord(newRecord, currentUser.id);

    setConfig((prev) => ({
      ...prev,
      dynamicId: dynId,
      content: targetUrl,
      isDynamic: true,
      title: prev.title || qrTitle,
    }));

    if (forceNew || existingIndex < 0) {
      setDestinationUpdateSuccess(`Created new Dynamic QR "${qrTitle}" (${dynId})! Added to your dashboard.`);
    } else {
      setDestinationUpdateSuccess(`Updated "${qrTitle}" (${dynId})! Scanners now land on: ${targetUrl}`);
    }
    setTimeout(() => setDestinationUpdateSuccess(null), 5000);
  };

  // Function to load a saved dynamic QR into the editor
  const handleLoadDynamicQR = (item: SavedDynamicQR) => {
    setConfig({
      ...item.config,
      content: item.destinationUrl,
      dynamicId: item.id,
      isDynamic: true,
    });
    if (item.config.pdfFileName) {
      setInputMode('pdf');
    } else {
      setInputMode('text');
    }
    setDestinationUpdateSuccess(`Loaded "${item.title}" into the editor. You can edit its destination or styling anytime.`);
    setTimeout(() => setDestinationUpdateSuccess(null), 4000);
  };

  // Function to create a new dynamic QR
  const handleCreateNewDynamicQR = () => {
    const newDynId = `dyn_${Math.random().toString(36).substring(2, 9)}`;
    setConfig({
      ...INITIAL_CONFIG,
      isDynamic: true,
      dynamicId: newDynId,
      title: '',
      content: '',
    });
    setInputMode('text');
    setDestinationUpdateSuccess(`Started new Dynamic QR (${newDynId}). Enter your destination and save.`);
    setTimeout(() => setDestinationUpdateSuccess(null), 4000);
  };

  // Function to delete a saved dynamic QR
  const handleDeleteDynamicQR = async (idToDelete: string) => {
    if (!currentUser) return;
    const updated = savedDynamicQRs.filter((item) => item.id !== idToDelete);
    setSavedDynamicQRs(updated);
    try {
      localStorage.setItem(getStorageKey(currentUser.id), JSON.stringify(updated));
    } catch (err) {
      console.warn('Storage error:', err);
    }
    await deleteDynamicQRRecord(idToDelete, currentUser.id);
    if (config.dynamicId === idToDelete) {
      handleCreateNewDynamicQR();
    }
  };

  // Quick change destination directly from list
  const handleQuickUpdateDestination = async (id: string, newUrl: string) => {
    if (!currentUser || !newUrl.trim()) return;
    let targetItem: SavedDynamicQR | null = null;
    const updated = savedDynamicQRs.map((item) => {
      if (item.id === id) {
        const itemUpdated: SavedDynamicQR = {
          ...item,
          destinationUrl: newUrl.trim(),
          updatedAt: new Date().toISOString(),
          config: {
            ...item.config,
            content: newUrl.trim(),
          },
        };
        targetItem = itemUpdated;
        return itemUpdated;
      }
      return item;
    });

    setSavedDynamicQRs(updated);

    if (targetItem) {
      await saveDynamicQRRecord(targetItem, currentUser.id);
    }

    if (config.dynamicId === id) {
      setConfig((prev) => ({ ...prev, content: newUrl.trim() }));
    }
    setEditingTargetQRId(null);
    setDestinationUpdateSuccess(`Destination updated for ${id}! Scans now instantly redirect to "${newUrl.trim()}" without reprinting.`);
    setTimeout(() => setDestinationUpdateSuccess(null), 5000);
  };

  // Listen to Supabase Auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user);
      if (event === 'SIGNED_OUT' || !user) {
        setInputMode('text');
        setPdfUploading(false);
        setPdfError(null);
        setPdfUploadSuccess(false);
        setConfig((prev) => {
          if (prev.pdfFileName || prev.uploadedPdfUrl) {
            return { ...INITIAL_CONFIG };
          }
          return prev;
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Restore configuration from URL hash if shared
  useEffect(() => {
    try {
      const hash = window.location.hash;
      if (hash.startsWith('#config=')) {
        const encoded = hash.replace('#config=', '');
        const decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))));
        if (decoded && decoded.content) {
          setConfig(decoded);
          if (decoded.pdfFileName) {
            setInputMode('pdf');
          }
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

  // PDF File Handler - With Supabase Cloud Storage Upload for instant QR generation
  const handlePdfUpload = async (file: File) => {
    setPdfError(null);
    setPdfUploadSuccess(false);
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfError('Please select a valid PDF file (.pdf format only).');
      return;
    }

    // Limit to 25MB for cloud documents
    if (file.size > 25 * 1024 * 1024) {
      setPdfError('File size exceeds 25MB limit. Please upload a smaller document.');
      return;
    }

    const formattedSize =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const cleanTitle = file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');

    // If user is not logged in, prompt sign up for cloud PDF hosting & dynamic features
    if (!currentUser) {
      setConfig((prev) => ({
        ...prev,
        title: prev.title || cleanTitle,
        pdfFileName: file.name,
        pdfFileSize: formattedSize,
      }));
      setAuthReason('Sign up for a free account to upload your PDF to cloud storage and generate the live scannable QR code automatically.');
      setIsAuthModalOpen(true);
      return;
    }

    // Authenticated: Upload to Supabase Storage Bucket
    try {
      setPdfUploading(true);
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniquePath = `${currentUser.id}/${Date.now()}_${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(PDF_STORAGE_BUCKET)
        .upload(uniquePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/pdf',
        });

      if (uploadError) {
        console.warn('Supabase storage upload notice:', uploadError);
        throw uploadError;
      }

      // Retrieve public URL from Supabase
      const { data: publicUrlData } = supabase.storage
        .from(PDF_STORAGE_BUCKET)
        .getPublicUrl(uniquePath);

      const generatedDocUrl = publicUrlData.publicUrl;
      const dynId = config.dynamicId || `dyn_${Math.random().toString(36).substring(2, 8)}`;

      const newConfig: QRConfig = {
        ...config,
        content: generatedDocUrl,
        uploadedPdfUrl: generatedDocUrl,
        title: config.title || cleanTitle,
        pdfFileName: file.name,
        pdfFileSize: formattedSize,
        isDynamic: true,
        dynamicId: dynId,
      };

      setConfig(newConfig);
      setPdfUploadSuccess(true);

      // Auto-save/update to Supabase Database & saved library
      const recordToSave: SavedDynamicQR = {
        id: dynId,
        userId: currentUser.id,
        title: newConfig.title || cleanTitle,
        destinationUrl: generatedDocUrl,
        config: newConfig,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveDynamicQRRecord(recordToSave, currentUser.id);

      setSavedDynamicQRs((prev) => {
        const idx = prev.findIndex((item) => item.id === dynId);
        if (idx >= 0) {
          const list = [...prev];
          list[idx] = recordToSave;
          return list;
        }
        return [recordToSave, ...prev];
      });

      setDestinationUpdateSuccess(`PDF uploaded & connected! Scans now instantly open "${file.name}".`);
      setTimeout(() => setDestinationUpdateSuccess(null), 5000);
    } catch (err: any) {
      console.error('Supabase PDF upload error:', err);
      const message = err.message || 'Failed to upload PDF document.';
      if (message.includes('bucket') || message.includes('not found') || message.includes('row-level security')) {
        setPdfError(
          'Document storage notice: Please ensure your "pdf-documents" bucket is set up in Supabase Storage with public access, or paste your document URL below.'
        );
      } else {
        setPdfError(message);
      }
    } finally {
      setPdfUploading(false);
    }
  };

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePdfUpload(file);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out notice:', e);
    }
    // Fully reset user and session states to guarantee complete isolation between Pro and Free mode
    setCurrentUser(null);
    setInputMode('text');
    setPdfUploading(false);
    setPdfError(null);
    setPdfUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // If current configuration was tied to an uploaded Pro PDF document, reset to fresh initial config
    setConfig((prev) => {
      if (prev.pdfFileName || prev.uploadedPdfUrl) {
        return {
          ...INITIAL_CONFIG,
        };
      }
      return prev;
    });
  };

  const clearPdf = () => {
    setConfig((prev) => ({
      ...prev,
      pdfFileName: undefined,
      pdfFileSize: undefined,
      uploadedPdfUrl: undefined,
      content: prev.content === prev.uploadedPdfUrl || prev.content.startsWith('data:') ? '' : prev.content,
    }));
    setPdfError(null);
    setPdfUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearContent = () => {
    setConfig((prev) => ({
      ...prev,
      content: '',
      pdfFileName: undefined,
      pdfFileSize: undefined,
      uploadedPdfUrl: undefined,
    }));
    setPdfError(null);
    setPdfUploadSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSwitchInputMode = (mode: 'text' | 'pdf') => {
    setInputMode(mode);
    setPdfError(null);
    if (mode === 'text') {
      // When switching to text mode, clear any attached PDF metadata to ensure 100% clean isolation
      setConfig((prev) => ({
        ...prev,
        pdfFileName: undefined,
        pdfFileSize: undefined,
        uploadedPdfUrl: undefined,
        content: prev.uploadedPdfUrl && prev.content === prev.uploadedPdfUrl ? '' : prev.content,
      }));
      setPdfUploadSuccess(false);
    }
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
      title: prev.title,
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

  // If URL has dynamic redirect ID, show live redirect screen
  if (redirectId) {
    return (
      <DynamicRedirectView
        dynamicId={redirectId}
        onGoHome={() => {
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('r');
            window.history.pushState({}, '', url.pathname);
          }
          setRedirectId(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-900 flex flex-col items-center">
      {/* Top Header & Brand Bar */}
      <header className="w-full bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Venture Badge */}
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 truncate">
                QR Code Generator
              </h1>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 font-medium truncate">
                <Building2 className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="truncate">Meena Technologies</span>
              </div>
            </div>
          </div>

          {/* Header Action Tools & Prominent Sign-Up Access */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-xl px-2 sm:px-2.5 py-1.5 transition">
                <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                  {currentUser.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-[11px] font-bold text-slate-800 truncate max-w-[110px]">
                    {currentUser.email?.split('@')[0]}
                  </span>
                  <span className="text-[9px] font-semibold text-indigo-600 uppercase flex items-center gap-0.5">
                    <Zap className="w-2.5 h-2.5" /> Pro Tier
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out"
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition ml-0.5 sm:ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthReason('Sign in to your account to manage your dynamic QR codes and uploaded PDF files.');
                    setIsAuthModalOpen(true);
                  }}
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-semibold text-xs transition min-h-[38px] sm:min-h-[42px]"
                  id="header-login-btn"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-500" />
                  <span>Log In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthReason('Create a free account to upload PDF documents and create editable QR codes.');
                    setIsAuthModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs transition shadow-sm active:scale-95 min-h-[38px] sm:min-h-[42px]"
                  id="header-signup-btn"
                >
                  <UserPlus className="w-3.5 h-3.5 text-indigo-200 shrink-0" />
                  <span className="hidden xs:inline">Sign Up Free</span>
                  <span className="inline xs:hidden">Sign Up</span>
                </button>
              </div>
            )}

            <button
              onClick={() => setIsShareModalOpen(true)}
              disabled={!config.content.trim()}
              className="inline-flex items-center gap-1.5 sm:gap-2 p-2 sm:px-3.5 sm:py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs tracking-wide transition shadow-xs active:scale-95 disabled:opacity-40 min-h-[38px] sm:min-h-[42px]"
              id="header-share-btn"
              title="Share QR Code"
            >
              <Share2 className="w-4 h-4 text-indigo-600 shrink-0" strokeWidth={2} />
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
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs tracking-wide transition shadow-sm active:scale-95 disabled:opacity-40 min-h-[38px] sm:min-h-[42px]"
              id="header-png-btn"
              title="Download PNG Image"
            >
              <Download className="w-4 h-4 text-white shrink-0" strokeWidth={2} />
              <span className="hidden sm:inline">Download PNG</span>
              <span className="inline sm:hidden">PNG</span>
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

      {/* Free vs Pro Distinct Tier Banner */}
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6">
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-3.5 sm:p-5 text-white shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5 sm:gap-4">
          <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-xs sm:text-base text-white">Choose Your Plan:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 whitespace-nowrap">
                  Free Forever
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 whitespace-nowrap">
                  Pro Cloud
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-1 leading-relaxed">
                <strong className="text-emerald-400 font-semibold">Free:</strong> Standard QR (Links, Text, Wi-Fi) + 3D Frames + High-res downloads.
                <span className="block sm:inline sm:ml-2">
                  <strong className="text-indigo-300 font-semibold">Pro:</strong> Direct PDF upload & editable link destinations.
                </span>
              </p>
            </div>
          </div>

          {!currentUser && (
            <button
              type="button"
              onClick={() => {
                setAuthReason('Sign up for a free account to upload PDF documents and update QR links anytime.');
                setIsAuthModalOpen(true);
              }}
              className="w-full md:w-auto px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95 shrink-0 min-h-[40px] sm:min-h-[42px]"
            >
              <UserPlus className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>Unlock Pro Features Free</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workspace Container */}
      <main className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Form: Configurator */}
          <div className={`lg:col-span-7 space-y-5 sm:space-y-6 ${activeMobileTab === 'editor' ? 'block' : 'hidden lg:block'}`}>
            
            {/* Section 1: Content & Document Source */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3.5 sm:space-y-5">
              <div className="flex items-center justify-between pb-3 sm:pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-sm ring-2 sm:ring-4 ring-indigo-50 shrink-0">
                    1
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h2 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                        Destination Content & Source
                      </h2>
                      <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        Step 1
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 line-clamp-1 sm:line-clamp-none">
                      Choose between standard website/text links or upload a PDF document.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic QR Active State Banner (Top of Editor) */}
              {currentUser && config.dynamicId && savedDynamicQRs.some((item) => item.id === config.dynamicId) && (
                <div className="p-2.5 bg-indigo-50/90 border border-indigo-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
                    <span className="text-slate-600 font-medium shrink-0">Editing:</span>
                    <span className="font-bold text-slate-900 truncate">
                      "{config.title || 'Dynamic QR'}"
                    </span>
                    <span className="font-mono text-[10px] text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-100 shrink-0 hidden sm:inline-block">
                      {config.dynamicId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateNewDynamicQR}
                    className="shrink-0 px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New QR</span>
                  </button>
                </div>
              )}

              {/* Source Mode Toggle: Web URL / Text vs PDF File */}
              <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => handleSwitchInputMode('text')}
                  className={`flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition min-h-[42px] ${
                    inputMode === 'text'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 shrink-0" />
                  <span className="truncate">Web / Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchInputMode('pdf')}
                  className={`flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition min-h-[42px] ${
                    inputMode === 'pdf'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600 shrink-0" />
                  <span className="truncate">PDF File</span>
                  <span className="text-[9px] sm:text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 shrink-0">
                    Pro
                  </span>
                  {config.pdfFileName && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  )}
                </button>
              </div>

              {/* URL or Text Mode */}
              {inputMode === 'text' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700" htmlFor="content">
                        Destination URL or Text
                      </label>
                      {config.content.length > 0 && (
                        <button
                          type="button"
                          onClick={clearContent}
                          className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 flex items-center gap-1 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Clear input</span>
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        id="content"
                        name="content"
                        type="text"
                        placeholder="https://example.com or enter custom text"
                        value={config.content}
                        onChange={(e) => {
                          const val = e.target.value;
                          setConfig((prev) => ({
                            ...prev,
                            content: val,
                            pdfFileName: undefined,
                            pdfFileSize: undefined,
                            uploadedPdfUrl: undefined,
                          }));
                        }}
                        className="w-full pl-3.5 pr-16 py-3 sm:py-2.5 text-base sm:text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition font-mono text-slate-800 min-h-[44px]"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                        {config.content.length > 0 && (
                          <button
                            type="button"
                            onClick={clearContent}
                            title="Clear input"
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <Link2 className="w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Real-time Content Validation Feedback */}
                    <div className="mt-2 flex items-center justify-between text-[11px] px-0.5">
                      {!config.content.trim() ? (
                        <span className="text-amber-600 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          Empty — enter a URL or text to render your QR code
                        </span>
                      ) : config.content.length > 2000 ? (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          Exceeds optical QR size limit (~2,000 characters)
                        </span>
                      ) : /^https?:\/\/.+/i.test(config.content.trim()) ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          Valid web destination URL
                        </span>
                      ) : (
                        <span className="text-indigo-600 font-medium flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5 shrink-0" />
                          Plain text encoded
                        </span>
                      )}
                      {config.content.length > 0 && (
                        <span className={`text-[10px] font-mono shrink-0 ${config.content.length > 2000 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                          {config.content.length} chars
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* PDF Document Mode */}
              {inputMode === 'pdf' && (
                <div className="space-y-4">
                  {/* Pro Cloud Storage Banner */}
                  <div className="p-3.5 bg-gradient-to-r from-indigo-50/90 to-blue-50/80 rounded-xl border border-indigo-100 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>PDF-to-QR Cloud Hosting</span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-indigo-600 text-white">
                            Dynamic Pro
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Upload any PDF. When you replace it or change the link later, your downloaded QR code keeps working automatically!
                        </p>
                      </div>
                    </div>
                    {!currentUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthReason('Sign up for free to upload PDF documents and create editable QR codes.');
                          setIsAuthModalOpen(true);
                        }}
                        className="shrink-0 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                      >
                        Sign Up Free
                      </button>
                    )}
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handlePdfFileSelect}
                    className="hidden"
                    id="pdf-upload-input"
                  />

                  {config.pdfFileName ? (
                    /* Active Uploaded PDF Card */
                    <div className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {config.pdfFileName}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-slate-500 font-medium">
                                {config.pdfFileSize || 'PDF Document'}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Live & Connected
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={clearPdf}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Remove PDF"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* PDF Action Buttons */}
                      <div className="pt-2 border-t border-emerald-100/80 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={pdfUploading}
                          className="flex-1 px-3 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-2xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{pdfUploading ? 'Uploading...' : 'Replace with New PDF'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTempDestination(config.content);
                            setIsEditingDestination(!isEditingDestination);
                          }}
                          className="px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Change Target URL</span>
                        </button>
                      </div>

                      {/* Inline Destination Modifier */}
                      {isEditingDestination && (
                        <div className="pt-2 border-t border-emerald-100 space-y-2">
                          <label className="block text-[11px] font-semibold text-slate-700">
                            New Destination (URL or text):
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={tempDestination}
                              onChange={(e) => setTempDestination(e.target.value)}
                              placeholder="https://example.com/new-menu.pdf"
                              className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-600 font-mono text-slate-800"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                if (tempDestination.trim()) {
                                  if (config.dynamicId) {
                                    await handleUpdateQRDestination(config.dynamicId, tempDestination);
                                  } else {
                                    setConfig((prev) => ({ ...prev, content: tempDestination.trim() }));
                                  }
                                  setIsEditingDestination(false);
                                }
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Clean Drop & Upload Zone */
                    <div
                      onClick={() => {
                        if (!currentUser) {
                          setAuthReason('Create a free account to upload PDF documents and create editable QR codes.');
                          setIsAuthModalOpen(true);
                        } else {
                          fileInputRef.current?.click();
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handlePdfUpload(file);
                      }}
                      className={`border-2 border-dashed ${
                        currentUser
                          ? 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/20'
                          : 'border-slate-300 hover:border-indigo-300 bg-slate-50/50'
                      } rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer transition text-center group min-h-[140px]`}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-white shadow-xs group-hover:scale-105 text-indigo-600 flex items-center justify-center transition mb-2.5 border border-slate-100">
                        {pdfUploading ? (
                          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload className="w-6 h-6" />
                        )}
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {pdfUploading
                          ? 'Uploading document to cloud storage...'
                          : currentUser
                          ? 'Click or drag PDF file here to upload'
                          : 'Sign Up / Log In to Upload PDF Directly'}
                      </span>
                      <span className="text-xs text-slate-500 mt-1">
                        {currentUser
                          ? 'Supports digital menus, product catalogs, brochures, flyers (up to 25MB)'
                          : 'Free Pro Account • Secure cloud storage & editable QR destination'}
                      </span>
                    </div>
                  )}

                  {pdfError && (
                    <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{pdfError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic QR Code Feature & Architecture Section */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>QR Code Architecture</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {config.isDynamic ? 'Dynamic Active' : 'Static Mode'}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Choose between a permanent static QR or an editable dynamic cloud QR.
                      </p>
                    </div>
                  </div>

                  {/* Toggle Selector */}
                  <div className="flex p-0.5 bg-slate-100 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, isDynamic: false }))}
                      className={`px-2.5 py-1 rounded-md transition ${
                        !config.isDynamic
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Static
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentUser) {
                          setAuthReason('Sign up free to create Dynamic QR codes with editable cloud destinations.');
                          setIsAuthModalOpen(true);
                        } else {
                          setConfig((prev) => ({
                            ...prev,
                            isDynamic: true,
                            dynamicId: prev.dynamicId ?? `dyn_${Math.random().toString(36).substring(2, 8)}`,
                          }));
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                        config.isDynamic
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-500 hover:text-indigo-600'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>Dynamic (Pro)</span>
                    </button>
                  </div>
                </div>

                {/* Static Mode Guidance */}
                {!config.isDynamic && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-start gap-2.5 text-xs text-slate-600">
                    <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-800">Standard Static QR: </span>
                      The destination is permanently encoded directly into the QR pattern pixels. Free forever, no account required. Once printed, the destination cannot be changed.
                    </div>
                  </div>
                )}

                {/* Dynamic QR Feature — Destination Manager & My Saved Codes Library */}
                {config.isDynamic && (
                  <div className="p-4 bg-gradient-to-br from-indigo-50/90 via-blue-50/50 to-white rounded-xl border border-indigo-200/80 shadow-xs space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          Dynamic Cloud Redirection Engine
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                          ID: {config.dynamicId || 'DYN-ACTIVE'}
                        </span>
                      </div>
                    </div>

                    {/* How Dynamic Works Explainer (Clean, No Analytics) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-white/90 rounded-lg border border-indigo-100 shadow-2xs">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-0.5">
                          <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] flex items-center justify-center font-black">1</span>
                          <span>Print Once, Lasts Forever</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Your printed QR code image never changes. Print posters, cards, or signs.
                        </p>
                      </div>

                      <div className="p-2.5 bg-white/90 rounded-lg border border-indigo-100 shadow-2xs">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5 mb-0.5">
                          <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-700 text-[10px] flex items-center justify-center font-black">2</span>
                          <span>Update Target Anytime</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Change where scanners land whenever you want without reprinting anything.
                        </p>
                      </div>
                    </div>

                    {/* Current Dynamic Code Destination & Save Action */}
                    <div className="bg-white rounded-xl p-3.5 border border-indigo-100 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">QR Destination:</span>
                        {!isEditingDestination && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setTempDestination(config.content);
                                setIsEditingDestination(true);
                                setDestinationUpdateSuccess(null);
                              }}
                              className="text-indigo-600 hover:text-indigo-800 font-bold text-xs flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Change Destination</span>
                            </button>
                            {savedDynamicQRs.some((item) => item.id === config.dynamicId) ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSaveOrUpdateDynamicQR()}
                                  title="Update destination for this active QR code"
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-[11px] shadow-2xs transition"
                                >
                                  Update This QR
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveOrUpdateDynamicQR(undefined, true)}
                                  title="Save as a separate new QR code without replacing previous ones"
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-[11px] shadow-2xs transition flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Save as New QR</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSaveOrUpdateDynamicQR()}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold text-[11px] shadow-2xs transition"
                              >
                                Save to My Account
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {isEditingDestination ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={tempDestination}
                            onChange={(e) => setTempDestination(e.target.value)}
                            placeholder="Type new URL or message..."
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-600 outline-none font-mono text-slate-800"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setIsEditingDestination(false)}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-md transition"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleSaveOrUpdateDynamicQR(tempDestination);
                                setIsEditingDestination(false);
                              }}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-xs transition"
                            >
                              Update Destination
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-slate-50 rounded-lg font-mono text-xs text-slate-700 truncate border border-slate-100 flex items-center justify-between">
                          <span className="truncate">{config.content.trim() ? config.content : <span className="text-slate-400 italic font-sans">No destination set yet — type a URL above</span>}</span>
                          <span className="text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 ml-2 shrink-0">
                            Active
                          </span>
                        </div>
                      )}

                      {destinationUpdateSuccess && (
                        <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{destinationUpdateSuccess}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDestinationUpdateSuccess(null)}
                            className="text-emerald-600 hover:text-emerald-900 ml-2"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Saved Dynamic Codes Library (Restored on Login) */}
                    <div className="pt-2 border-t border-indigo-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <FolderOpen className="w-4 h-4 text-indigo-600" />
                          <span>My Saved Dynamic QR Codes</span>
                          <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700">
                            {savedDynamicQRs.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCreateNewDynamicQR}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>New Dynamic QR</span>
                        </button>
                      </div>

                      {savedDynamicQRs.length === 0 ? (
                        <div className="p-3 bg-white/70 rounded-lg border border-dashed border-indigo-200 text-center text-xs text-slate-500">
                          <p>No saved dynamic QR codes yet.</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Enter your destination above and click <strong>Save to My Account</strong>. When you log back in, all your dynamic QR codes will appear here so you can change their destinations anytime.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                          {savedDynamicQRs.map((item) => {
                            const isCurrentlyLoaded = config.dynamicId === item.id;
                            const isEditingThis = editingTargetQRId === item.id;

                            return (
                              <div
                                key={item.id}
                                className={`p-2.5 rounded-lg border text-xs transition ${
                                  isCurrentlyLoaded
                                    ? 'bg-indigo-50/70 border-indigo-300 shadow-2xs'
                                    : 'bg-white border-slate-200 hover:border-indigo-200'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-slate-900 truncate">
                                        {item.title || 'Dynamic QR'}
                                      </span>
                                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                        {item.id}
                                      </span>
                                      {isCurrentlyLoaded && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-600 text-white shrink-0">
                                          Editing in Canvas
                                        </span>
                                      )}
                                    </div>
                                    <div className="font-mono text-[11px] text-indigo-700 truncate mt-0.5">
                                      → {item.destinationUrl}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleLoadDynamicQR(item)}
                                      title="Load this QR into editor"
                                      className="px-2 py-1 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-800 text-slate-700 font-semibold rounded text-[11px] transition flex items-center gap-1"
                                    >
                                      <span>Load</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingTargetQRId(isEditingThis ? null : item.id);
                                        setQuickEditUrl(item.destinationUrl);
                                      }}
                                      title="Change destination URL"
                                      className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDynamicQR(item.id)}
                                      title="Delete dynamic QR"
                                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Quick inline destination editor */}
                                {isEditingThis && (
                                  <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-1.5">
                                    <label className="block text-[10px] font-semibold text-slate-600">
                                      New Destination for {item.id}:
                                    </label>
                                    <div className="flex gap-1.5">
                                      <input
                                        type="text"
                                        value={quickEditUrl}
                                        onChange={(e) => setQuickEditUrl(e.target.value)}
                                        className="flex-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:ring-2 focus:ring-indigo-600 outline-none font-mono text-slate-800"
                                        placeholder="https://..."
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleQuickUpdateDestination(item.id, quickEditUrl)}
                                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded text-[11px] transition shadow-2xs"
                                      >
                                        Update
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingTargetQRId(null)}
                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] transition"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Poster Title Caption (Step 1 Part B) */}
              <div className="pt-2 border-t border-slate-100">
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

            {/* Section 3: Palette & Color Styling */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3.5 sm:space-y-5">
              <div className="flex items-center justify-between pb-3 sm:pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-sm ring-2 sm:ring-4 ring-amber-50 shrink-0">
                    3
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h2 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                        Color Palette & Styling
                      </h2>
                      <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        Step 3
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 line-clamp-1 sm:line-clamp-none">
                      Select high-contrast colors to ensure sharp scanning and brand consistency.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] sm:text-[11px] font-mono text-slate-700 uppercase font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                  {config.color}
                </span>
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
            <div className="bg-white rounded-2xl p-3.5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3.5 sm:space-y-4">
              <div className="flex items-center justify-between pb-3 sm:pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-sm ring-2 sm:ring-4 ring-emerald-50 shrink-0">
                    4
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h2 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                        Center Emblem & Badge
                      </h2>
                      <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        Step 4
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 line-clamp-1 sm:line-clamp-none">
                      Overlay an icon, logo symbol, or custom monogram badge in the center.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="centerIcon">
                    Center Emblem Symbol
                  </label>
                  <select
                    id="centerIcon"
                    name="centerIcon"
                    value={config.centerIcon}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition text-slate-700 font-medium min-h-[44px]"
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
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition font-mono uppercase text-slate-800 min-h-[44px]"
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
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition text-slate-700 font-medium min-h-[44px]"
                    >
                      <option value={1}>Compact (1 border unit)</option>
                      <option value={2}>Standard (2 border units)</option>
                      <option value={3}>Clean (3 border units)</option>
                      <option value={5}>Spacious (5 border units)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Export Settings & Precision */}
            <div className="bg-white rounded-2xl p-3.5 sm:p-6 border border-slate-200/90 shadow-sm space-y-3.5 sm:space-y-4">
              <div className="flex items-center justify-between pb-3 sm:pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-sm ring-2 sm:ring-4 ring-violet-50 shrink-0">
                    5
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h2 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                        Export Resolution & Precision
                      </h2>
                      <span className="hidden xs:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        Step 5
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 line-clamp-1 sm:line-clamp-none">
                      Configure output scale for sharp screens, Retina displays, or print production.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5" htmlFor="exportScale">
                    Export Resolution
                  </label>
                  <select
                    id="exportScale"
                    name="exportScale"
                    value={config.exportScale}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900 outline-none transition text-slate-700 font-medium min-h-[44px]"
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    Live Poster Preview
                  </span>
                  {config.pdfFileName ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 uppercase">
                      Pro PDF Document
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase">
                      Standard QR
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
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
              <div className="w-full max-w-[340px] sm:max-w-sm mt-4 grid grid-cols-3 gap-2">
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  disabled={!config.content.trim()}
                  className="py-3 px-2 sm:px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition shadow-xs active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[44px]"
                  id="preview-share-btn"
                >
                  <Share2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>Share</span>
                </button>

                <button
                  onClick={downloadPNG}
                  disabled={isDownloading || !config.content.trim()}
                  className="py-3 px-2 sm:px-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition shadow-sm active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[44px]"
                  id="preview-png-btn"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>PNG</span>
                </button>

                <button
                  onClick={downloadSVG}
                  disabled={!config.content.trim()}
                  className="py-3 px-2 sm:px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition shadow-xs active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 min-h-[44px]"
                  id="preview-svg-btn"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>SVG</span>
                </button>
              </div>

              {/* Mobile Back to Editor button */}
              <div className="w-full max-w-[340px] sm:max-w-sm mt-3 lg:hidden">
                <button
                  onClick={() => setActiveMobileTab('editor')}
                  className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-98 transition min-h-[44px]"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
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
                  Send or copy your generated QR poster
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
                  {config.title || (config.pdfFileName ? config.pdfFileName : 'QR Code Poster')}
                </p>
                <p className="text-[11px] text-slate-500 truncate font-mono">
                  {config.pdfFileName ? `PDF Document (${config.pdfFileSize || 'Ready'})` : config.content}
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

      {/* Supabase Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
        }}
        reason={authReason}
      />
    </div>
  );
};

export default App;

