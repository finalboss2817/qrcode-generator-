import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import {
  Sparkles,
  PartyPopper,
  Shield,
  Rotate3d,
  QrCode,
  Zap,
  Crown,
  Heart,
  Utensils,
  Music,
  AlertTriangle,
} from 'lucide-react';
import { QRConfig } from '../types';
import { getBorderThemeById } from '../borderThemes';

interface QRErrorBoundaryProps {
  children: React.ReactNode;
}

interface QRErrorBoundaryState {
  hasError: boolean;
}

class QRErrorBoundary extends React.Component<QRErrorBoundaryProps, QRErrorBoundaryState> {
  constructor(props: QRErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn('QR Code generation overflow caught safely:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-48 h-48 sm:w-52 sm:h-52 flex flex-col items-center justify-center text-amber-700 bg-amber-50/90 rounded-xl p-4 text-center border border-amber-200">
          <AlertTriangle className="w-8 h-8 mb-2 text-amber-500" />
          <span className="font-bold text-xs">Content Exceeds QR Limit</span>
          <span className="text-[11px] text-amber-800 mt-1 leading-tight">
            QR codes can only store up to ~2KB. Please provide a link/URL instead of raw binary data.
          </span>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ThemedQRPosterProps {
  config: QRConfig;
  activeBadge: string;
  qrRef: React.RefObject<SVGSVGElement | null>;
  onToggle3D?: () => void;
}

export const ThemedQRPoster: React.FC<ThemedQRPosterProps> = ({
  config,
  activeBadge,
  qrRef,
  onToggle3D,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const theme = getBorderThemeById(config.borderTheme);

  // 3D Tilt Spring Physics
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 220, mass: 0.5 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [14, -14]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-14, 14]), springConfig);

  const glareX = useTransform(mouseX, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(mouseY, [-0.5, 0.5], ['0%', '100%']);

  const [isHovered, setIsHovered] = useState<boolean>(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!config.enable3DTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  // Trigger celebratory confetti on click or theme activation
  const triggerConfetti = () => {
    if (typeof confetti === 'function') {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#e11d48', '#fbbf24', '#3b82f6', '#10b981', '#a855f7'],
      });
    }
  };

  // Auto trigger confetti once if birthday theme is chosen
  useEffect(() => {
    if (theme.has3DConfetti && config.enableAnimations) {
      triggerConfetti();
    }
  }, [config.borderTheme]);

  const bannerText = config.frameBannerText || theme.bannerText;

  return (
    <div className="w-full flex flex-col items-center select-none" style={{ perspective: 1200 }}>
      {/* 3D Motion Card Container */}
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: config.enable3DTilt ? rotateX : 0,
          rotateY: config.enable3DTilt ? rotateY : 0,
          transformStyle: 'preserve-3d',
        }}
        whileHover={config.enable3DTilt ? { scale: 1.02 } : undefined}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="w-full max-w-[340px] sm:max-w-sm rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-xl sm:shadow-2xl relative transition-all duration-300 mx-auto overflow-hidden group border border-white/20"
      >
        {/* Dynamic Background Base */}
        <div
          className="absolute inset-0 transition-colors duration-500 rounded-3xl"
          style={{ backgroundColor: config.color }}
        />

        {/* 3D Dynamic Glare Reflection Overlay */}
        {config.enable3DTilt && (
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-35 transition-opacity duration-300 rounded-3xl z-30"
            style={{
              background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 65%)`,
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* THEME 1: BIRTHDAY BASH 🎂🎈 */}
        {/* ========================================================================= */}
        {config.borderTheme === 'birthday' && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {/* Top Bunting Garland */}
            <div className="absolute top-1.5 inset-x-4 flex justify-between items-center opacity-90">
              <span className="text-sm">🎈</span>
              <div className="flex gap-1">
                {['#f43f5e', '#eab308', '#06b6d4', '#8b5cf6', '#10b981'].map((c, i) => (
                  <motion.div
                    key={i}
                    animate={config.enableAnimations ? { y: [0, -2, 0] } : undefined}
                    transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.15 }}
                    className="w-3.5 h-3.5 clip-triangle shadow-2xs"
                    style={{ backgroundColor: c, clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
                  />
                ))}
              </div>
              <span className="text-sm">🎁</span>
            </div>

            {/* Corner Animated Balloons */}
            <motion.div
              animate={config.enableAnimations ? { y: [-3, 3, -3], rotate: [-4, 4, -4] } : undefined}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="absolute -top-1 -left-1 text-2xl drop-shadow-md"
            >
              🎈
            </motion.div>
            <motion.div
              animate={config.enableAnimations ? { y: [3, -3, 3], rotate: [4, -4, 4] } : undefined}
              transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut', delay: 0.4 }}
              className="absolute -top-1 -right-1 text-2xl drop-shadow-md"
            >
              🎉
            </motion.div>

            {/* Floating Confetti Dots on Border */}
            <div className="absolute inset-0 opacity-80 pointer-events-none">
              <span className="absolute top-10 left-3 w-2 h-2 rounded-full bg-yellow-300 animate-ping opacity-75" />
              <span className="absolute top-14 right-3 w-2 h-2 rounded-full bg-pink-300" />
              <span className="absolute bottom-16 left-3 w-2.5 h-1 rounded-sm bg-cyan-300 rotate-45" />
              <span className="absolute bottom-12 right-3 w-2 h-2 rounded-full bg-emerald-300" />
            </div>

            {/* Bottom Celebration Badge */}
            <div className="absolute bottom-1 right-2 text-xl drop-shadow-md">
              🎂
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* THEME 2: WEDDING & ROMANCE 💍✨ */}
        {/* ========================================================================= */}
        {config.borderTheme === 'wedding' && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {/* Elegant Double Hairline Golden Frame */}
            <div className="absolute inset-2.5 border border-amber-300/60 rounded-2xl" />
            <div className="absolute inset-3.5 border border-amber-200/40 rounded-xl" />

            {/* Corner Botanical Floral Flourishes */}
            <div className="absolute top-2 left-2 text-amber-200/90 text-sm">❦</div>
            <div className="absolute top-2 right-2 text-amber-200/90 text-sm">❧</div>
            <div className="absolute bottom-2 left-2 text-amber-200/90 text-sm">❧</div>
            <div className="absolute bottom-2 right-2 text-amber-200/90 text-sm">❦</div>

            {/* Top Romantic Accent */}
            <div className="absolute top-1.5 inset-x-0 flex items-center justify-center gap-1.5 text-amber-100 text-xs font-serif tracking-widest uppercase">
              <span>✦</span>
              <span>💍</span>
              <span>✦</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* THEME 3: CYBER 3D NEON ⚡🔮 */}
        {/* ========================================================================= */}
        {config.borderTheme === 'cyberpunk' && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {/* Glowing Tech Corner HUD Reticles */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400 shadow-[0_0_8px_#22d3ee]" />

            {/* Animated Cyber Scan Line */}
            {config.enableAnimations && (
              <motion.div
                animate={{ y: ['0%', '100%', '0%'] }}
                transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60 shadow-[0_0_12px_#22d3ee]"
              />
            )}

            {/* Tech Specs Label */}
            <div className="absolute top-2 inset-x-8 flex justify-between text-[9px] font-mono font-bold tracking-widest text-cyan-300/80 uppercase">
              <span>HUD_V2.4</span>
              <span>SECURE_LINK</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* THEME 4: VIP GOLD GALA 👑★ */}
        {/* ========================================================================= */}
        {config.borderTheme === 'vip_gold' && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {/* Beveled Gold Inset Border */}
            <div className="absolute inset-2 border-2 border-amber-400/80 rounded-2xl shadow-inner" />
            <div className="absolute inset-3 border border-amber-200/50 rounded-xl" />

            {/* Crown & Star Corner Badges */}
            <div className="absolute top-1.5 left-2.5 text-amber-300 text-xs">★</div>
            <div className="absolute top-1.5 right-2.5 text-amber-300 text-xs">★</div>
            <div className="absolute bottom-2 left-2.5 text-amber-300 text-xs">★</div>
            <div className="absolute bottom-2 right-2.5 text-amber-300 text-xs">★</div>

            {/* Top Crown Emblem */}
            <div className="absolute top-1 inset-x-0 flex items-center justify-center gap-1 text-amber-300 text-sm">
              <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* THEME 5: BISTRO & DINING 🍽️🍷 */}
        {/* ========================================================================= */}
        {config.borderTheme === 'food_bistro' && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {/* Stitched Artisan Dashed Border */}
            <div className="absolute inset-2.5 border-2 border-dashed border-amber-200/60 rounded-2xl" />

            {/* Culinary Corner Icons */}
            <div className="absolute top-2 left-3 text-amber-100 text-xs">🍴</div>
            <div className="absolute top-2 right-3 text-amber-100 text-xs">🍷</div>
            <div className="absolute bottom-2 left-3 text-amber-100 text-xs">🥖</div>
            <div className="absolute bottom-2 right-3 text-amber-100 text-xs">☕</div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* THEME 6: PARTY & FESTIVAL 🎪♫ */}
        {/* ========================================================================= */}
        {config.borderTheme === 'party_fun' && (
          <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
            {/* Multi-colored Funky Rim */}
            <div className="absolute inset-2 border-2 border-fuchsia-300/70 rounded-2xl" />

            {/* Floating Music Notes & Disco Stars */}
            <motion.div
              animate={config.enableAnimations ? { rotate: [0, 15, -15, 0] } : undefined}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute top-1 left-2 text-sm"
            >
              🎵
            </motion.div>
            <motion.div
              animate={config.enableAnimations ? { rotate: [0, -15, 15, 0] } : undefined}
              transition={{ repeat: Infinity, duration: 2.2 }}
              className="absolute top-1 right-2 text-sm"
            >
              ⭐
            </motion.div>
            <div className="absolute bottom-1 left-2 text-sm">🎸</div>
            <div className="absolute bottom-1 right-2 text-sm">✨</div>
          </div>
        )}

        {/* Top Decorative Banner Ribbon (if specified or themed) */}
        {bannerText && (
          <div
            className="w-full text-center py-1 px-3 mb-2 rounded-lg bg-black/25 text-white text-[10px] font-bold tracking-wider uppercase border border-white/15 relative z-20"
            style={{ transform: 'translateZ(15px)' }}
          >
            {bannerText}
          </div>
        )}

        {/* Inner White QR Card (Raised in 3D Space) */}
        <div
          className="w-full bg-white rounded-xl sm:rounded-2xl p-3 sm:p-5 flex flex-col items-center justify-center relative shadow-md transition-all duration-300 z-10"
          style={{
            backgroundColor: config.bgColor,
            transform: config.enable3DTilt ? 'translateZ(20px)' : 'none',
          }}
        >
          {config.content.trim() ? (
            config.content.length > 2000 ? (
              <div className="w-44 h-44 sm:w-52 sm:h-52 flex flex-col items-center justify-center text-amber-800 bg-amber-50/90 rounded-xl p-3 sm:p-4 text-center border border-amber-200">
                <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 mb-1.5 sm:mb-2 text-amber-600" />
                <span className="font-bold text-xs">Content Exceeds QR Limit</span>
                <span className="text-[10px] sm:text-[11px] text-amber-700 mt-1 leading-tight">
                  QR codes can hold up to ~2,000 characters. For large files or PDFs, please paste the hosted link (Google Drive, Dropbox, or web link).
                </span>
              </div>
            ) : (
              <div className="relative flex items-center justify-center max-w-full p-1">
                <QRErrorBoundary>
                  <QRCodeSVG
                    ref={qrRef}
                    value={config.content}
                    size={200}
                    fgColor={config.color}
                    bgColor={config.bgColor}
                    level="H"
                    marginSize={config.margin}
                    className="rounded-lg w-full max-w-[200px] sm:max-w-[220px] h-auto aspect-square"
                  />
                </QRErrorBoundary>

                {/* Center Overlay Decal (Elevated in 3D) */}
                {config.centerIcon !== 'none' && activeBadge && (
                  <div
                    className="absolute inset-0 m-auto w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md border-2 border-white pointer-events-none transition-transform select-none"
                    style={{
                      backgroundColor: config.color,
                      transform: config.enable3DTilt ? 'translateZ(35px)' : 'none',
                    }}
                  >
                    <span className="truncate whitespace-nowrap">{activeBadge}</span>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="w-44 h-44 sm:w-52 sm:h-52 flex flex-col items-center justify-center text-slate-400 text-xs font-medium border-2 border-dashed border-slate-200 rounded-xl px-3 sm:px-4 text-center">
              <QrCode className="w-8 h-8 sm:w-10 sm:h-10 mb-2 text-slate-300" strokeWidth={1.5} />
              <span className="font-semibold text-slate-600">No content yet</span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Enter a URL, text, or upload a PDF to render your QR code</span>
            </div>
          )}
        </div>

        {/* Poster Title Caption */}
        {config.title.trim() && (
          <div
            className="mt-3.5 px-2 w-full text-center relative z-20"
            style={{ transform: config.enable3DTilt ? 'translateZ(18px)' : 'none' }}
          >
            <h3 className="text-white font-bold text-sm sm:text-base leading-snug tracking-wide truncate drop-shadow-xs">
              {config.title}
            </h3>
          </div>
        )}
      </motion.div>

      {/* Interactive Controls Pill below 3D card */}
      <div className="w-full max-w-[340px] sm:max-w-sm flex items-center justify-between mt-3 px-1">
        <button
          type="button"
          onClick={onToggle3D}
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition min-h-[36px] ${
            config.enable3DTilt
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
              : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700'
          }`}
          title="Toggle 3D perspective tilt on hover"
        >
          <Rotate3d className="w-3.5 h-3.5" />
          <span>3D Tilt: {config.enable3DTilt ? 'Active' : 'Flat'}</span>
        </button>

        {theme.has3DConfetti && (
          <button
            type="button"
            onClick={triggerConfetti}
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-700 transition active:scale-95 min-h-[36px]"
          >
            <PartyPopper className="w-3.5 h-3.5 text-pink-600" />
            <span>Celebrate 🎉</span>
          </button>
        )}
      </div>
    </div>
  );
};
