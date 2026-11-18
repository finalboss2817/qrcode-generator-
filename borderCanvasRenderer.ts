import { QRConfig } from './types';
import { getBorderThemeById } from './borderThemes';

export const POSTER_FONT_FAMILY =
  "'Plus Jakarta Sans', 'Noto Sans Gujarati', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export interface PosterLayout {
  scale: number;
  outerMargin: number;
  posterWidth: number;
  posterHeight: number;
  width: number;
  height: number;
  qrSize: number;
  cardPadding: number;
  cardX: number;
  cardY: number;
  cardWidth: number;
  cardHeight: number;
  framePaddingX: number;
  framePaddingTop: number;
  footerHeight: number;
  bannerText: string;
  showDynamicBadge: boolean;
  bannerX: number;
  bannerY: number;
  bannerWidth: number;
  bannerHeight: number;
  bannerFontSize: number;
  bannerLineHeight: number;
  bannerLines: string[];
  titleFontSize: number;
  titleLineHeight: number;
  titleLines: string[];
  titleStartY: number;
}

/**
 * Wraps text into multiple lines that cleanly fit within maxWidth on a 2D canvas.
 * Falls back to character-level breaking for ultra-long unbroken strings so nothing is ever cut off.
 */
function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const clean = text.trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    const words = trimmedPara.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }
        // If a single word exceeds maxWidth, break it safely by characters
        if (ctx.measureText(word).width > maxWidth) {
          let chunk = '';
          for (const char of Array.from(word)) {
            const nextChunk = chunk + char;
            if (ctx.measureText(nextChunk).width > maxWidth && chunk) {
              lines.push(chunk);
              chunk = char;
            } else {
              chunk = nextChunk;
            }
          }
          currentLine = chunk;
        } else {
          currentLine = word;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Computes complete dynamic poster dimensions before drawing so top decorations,
 * banners, titles, and theme ornaments never overlap or get clipped while downloading or sharing.
 */
export const computePosterLayout = (
  ctx: CanvasRenderingContext2D,
  config: QRConfig,
  scale: number
): PosterLayout => {
  const outerMargin = 20 * scale; // Safe studio mat around rounded poster card so share apps never crop edges/corners
  const baseQr = 560;
  const qrSize = baseQr * scale;
  const cardPadding = 48 * scale;
  const cardWidth = qrSize + cardPadding * 2;
  const cardHeight = qrSize + cardPadding * 2;
  const framePaddingX = 52 * scale;
  const posterWidth = cardWidth + framePaddingX * 2;

  const theme = getBorderThemeById(config.borderTheme);
  const bannerText = (config.frameBannerText?.trim() || theme.bannerText || '').trim();
  const showDynamicBadge = Boolean(config.isDynamic && !bannerText);
  const hasThemedFrame = config.borderTheme !== 'classic';

  // 1. Dedicated Top Decoration Header + Banner Ribbon Sizing
  const bannerX = framePaddingX;
  const bannerWidth = cardWidth;
  const bannerMaxTextWidth = bannerWidth - 48 * scale;
  // Generous 74*scale headroom above the ribbon for themed frames so garlands, crowns, and icons are never cramped or clipped
  const bannerY = hasThemedFrame ? 74 * scale : 32 * scale;

  let bannerFontSize = 24 * scale;
  let bannerLines: string[] = [];
  let bannerLineHeight = Math.round(bannerFontSize * 1.32);
  let bannerHeight = 0;

  if (bannerText) {
    const candidateSizes = [24 * scale, 21 * scale, 18 * scale];
    for (const size of candidateSizes) {
      ctx.font = `700 ${size}px ${POSTER_FONT_FAMILY}`;
      const wrapped = wrapTextLines(ctx, bannerText, bannerMaxTextWidth);
      bannerFontSize = size;
      bannerLines = wrapped;
      if (wrapped.length <= 2) break;
    }
    bannerLineHeight = Math.round(bannerFontSize * 1.32);
    bannerHeight = Math.max(
      56 * scale,
      bannerLines.length * bannerLineHeight + 24 * scale
    );
  } else if (showDynamicBadge) {
    bannerFontSize = 18 * scale;
    bannerLineHeight = Math.round(bannerFontSize * 1.3);
    bannerLines = ['DYNAMIC QR • CLOUD MANAGED'];
    bannerHeight = 46 * scale;
  }

  const framePaddingTop =
    bannerHeight > 0
      ? bannerY + bannerHeight + 22 * scale
      : hasThemedFrame
      ? 78 * scale
      : 48 * scale;

  const cardX = framePaddingX;
  const cardY = framePaddingTop;

  // 2. Bottom Title Caption Sizing (auto-wraps with safe side clearances)
  const titleText = config.title.trim();
  let titleFontSize = 34 * scale;
  let titleLines: string[] = [];
  let titleLineHeight = Math.round(titleFontSize * 1.32);
  let footerHeight = hasThemedFrame ? 64 * scale : 48 * scale;
  let titleStartY = cardY + cardHeight;

  if (titleText) {
    const titleMaxWidth = posterWidth - 156 * scale; // 78*scale safe margin on each side for corner emblems
    const candidateTitleSizes = [34 * scale, 30 * scale, 26 * scale];
    for (const size of candidateTitleSizes) {
      ctx.font = `700 ${size}px ${POSTER_FONT_FAMILY}`;
      const wrapped = wrapTextLines(ctx, titleText, titleMaxWidth);
      titleFontSize = size;
      titleLines = wrapped;
      if (wrapped.length <= 2) break;
    }

    titleLineHeight = Math.round(titleFontSize * 1.32);
    const titleTopGap = 26 * scale;
    const titleBottomPad = hasThemedFrame ? 48 * scale : 38 * scale;
    const textBlockHeight = titleLines.length * titleLineHeight;
    footerHeight = titleTopGap + textBlockHeight + titleBottomPad;
    titleStartY = cardY + cardHeight + titleTopGap + titleLineHeight / 2;
  }

  const posterHeight = framePaddingTop + cardHeight + footerHeight;

  return {
    scale,
    outerMargin,
    posterWidth,
    posterHeight,
    width: posterWidth + outerMargin * 2,
    height: posterHeight + outerMargin * 2,
    qrSize,
    cardPadding,
    cardX,
    cardY,
    cardWidth,
    cardHeight,
    framePaddingX,
    framePaddingTop,
    footerHeight,
    bannerText,
    showDynamicBadge,
    bannerX,
    bannerY,
    bannerWidth,
    bannerHeight,
    bannerFontSize,
    bannerLineHeight,
    bannerLines,
    titleFontSize,
    titleLineHeight,
    titleLines,
    titleStartY,
  };
};

/**
 * Renders high-fidelity theme decorations (bunting, balloons, ribbons, laurels, cyber brackets, crowns)
 * in poster-local coordinates (0..posterWidth, 0..posterHeight) with generous safe margins.
 */
export const drawThemeDecorationsOnCanvas = (
  ctx: CanvasRenderingContext2D,
  config: QRConfig,
  dim: PosterLayout
) => {
  const {
    posterWidth: width,
    posterHeight: height,
    cardY,
    cardHeight,
    scale,
    bannerText,
    showDynamicBadge,
    bannerX,
    bannerY,
    bannerWidth,
    bannerHeight,
    bannerFontSize,
    bannerLineHeight,
    bannerLines,
  } = dim;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Top Decorative Banner Ribbon (bold, legible, never clipped)
  if (bannerText && bannerLines.length > 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 14 * scale);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${bannerFontSize}px ${POSTER_FONT_FAMILY}`;

    const totalTextHeight = bannerLines.length * bannerLineHeight;
    const firstLineY = bannerY + (bannerHeight - totalTextHeight) / 2 + bannerLineHeight / 2;
    bannerLines.forEach((line, idx) => {
      ctx.fillText(line, width / 2, firstLineY + idx * bannerLineHeight);
    });
  } else if (showDynamicBadge) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.36)';
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 12 * scale);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    ctx.fillStyle = '#e0e7ff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${bannerFontSize}px ${POSTER_FONT_FAMILY}`;
    ctx.fillText('●  DYNAMIC QR • CLOUD MANAGED', width / 2, bannerY + bannerHeight / 2);
  }

  // 2. Theme Specific Ornaments (centered safely in header strip y=20..62 and side margins)
  switch (config.borderTheme) {
    case 'birthday': {
      // Top Festive Bunting Garland cleanly centered above the ribbon (y=24..50)
      const garlandColors = ['#f43f5e', '#eab308', '#06b6d4', '#8b5cf6', '#10b981', '#f97316', '#ec4899'];
      const flagCount = garlandColors.length;
      const flagWidth = 22 * scale;
      const flagGap = 10 * scale;
      const totalGarlandWidth = flagCount * flagWidth + (flagCount - 1) * flagGap;
      const startX = (width - totalGarlandWidth) / 2;
      const ropeY = 24 * scale;

      // Subtle garland string
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(startX - 14 * scale, ropeY);
      ctx.quadraticCurveTo(width / 2, ropeY + 6 * scale, startX + totalGarlandWidth + 14 * scale, ropeY);
      ctx.stroke();

      // Colorful pennant flags
      garlandColors.forEach((col, idx) => {
        const fx = startX + idx * (flagWidth + flagGap);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(fx, ropeY + 1 * scale);
        ctx.lineTo(fx + flagWidth, ropeY + 1 * scale);
        ctx.lineTo(fx + flagWidth / 2, ropeY + 23 * scale);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();
      });

      // Top-left & Top-right celebratory emojis safely inside rounded corner & well above ribbon
      ctx.font = `${26 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎈', 56 * scale, 38 * scale);
      ctx.fillText('🎉', width - 56 * scale, 38 * scale);

      // Confetti dots strictly inside side margins
      const confettiColors = ['#f43f5e', '#fbbf24', '#38bdf8', '#4ade80', '#c084fc'];
      const dots = [
        { x: 25 * scale, y: cardY + 120 * scale, r: 5.5 * scale, c: confettiColors[0] },
        { x: 28 * scale, y: cardY + cardHeight * 0.55, r: 4.5 * scale, c: confettiColors[1] },
        { x: 24 * scale, y: height - 98 * scale, r: 5.5 * scale, c: confettiColors[2] },
        { x: width - 25 * scale, y: cardY + 130 * scale, r: 5.5 * scale, c: confettiColors[3] },
        { x: width - 28 * scale, y: cardY + cardHeight * 0.58, r: 5.5 * scale, c: confettiColors[4] },
        { x: width - 24 * scale, y: height - 102 * scale, r: 4.5 * scale, c: confettiColors[0] },
      ];

      dots.forEach((dot) => {
        ctx.fillStyle = dot.c;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Side balloons cleanly placed in outer left/right margins below top corners
      drawBalloon(ctx, 26 * scale, cardY + 24 * scale, 12 * scale, '#f43f5e', scale);
      drawBalloon(ctx, width - 26 * scale, cardY + 24 * scale, 12 * scale, '#fbbf24', scale);

      // Bottom corner party accents safely outside title box
      ctx.font = `${26 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎈', 36 * scale, height - 38 * scale);
      ctx.fillText('🎂', width - 36 * scale, height - 38 * scale);
      break;
    }

    case 'wedding': {
      // Elegant Golden Double Hairline Frame
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.72)';
      ctx.lineWidth = 2.2 * scale;
      ctx.beginPath();
      ctx.roundRect(14 * scale, 14 * scale, width - 28 * scale, height - 28 * scale, 24 * scale);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(253, 230, 138, 0.35)';
      ctx.lineWidth = 1.2 * scale;
      ctx.beginPath();
      ctx.roundRect(22 * scale, 22 * scale, width - 44 * scale, height - 44 * scale, 18 * scale);
      ctx.stroke();

      // Corner floral glyphs cleanly inside the inner border
      ctx.fillStyle = 'rgba(254, 240, 138, 0.92)';
      ctx.font = `${20 * scale}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❦', 42 * scale, 44 * scale);
      ctx.fillText('❧', width - 42 * scale, 44 * scale);
      ctx.fillText('❧', 42 * scale, height - 38 * scale);
      ctx.fillText('❦', width - 42 * scale, height - 38 * scale);

      // Top centerpiece flourish completely clear of borders & ribbon
      ctx.fillStyle = 'rgba(254, 240, 138, 0.95)';
      ctx.font = `${20 * scale}px serif`;
      ctx.fillText('✦  💍  ✦', width / 2, 44 * scale);
      break;
    }

    case 'cyberpunk': {
      // Tech Neon HUD Brackets
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3.5 * scale;
      const bracketSize = 28 * scale;

      // Top-Left Bracket
      ctx.beginPath();
      ctx.moveTo(18 * scale, 18 * scale + bracketSize);
      ctx.lineTo(18 * scale, 18 * scale);
      ctx.lineTo(18 * scale + bracketSize, 18 * scale);
      ctx.stroke();

      // Top-Right Bracket
      ctx.beginPath();
      ctx.moveTo(width - 18 * scale - bracketSize, 18 * scale);
      ctx.lineTo(width - 18 * scale, 18 * scale);
      ctx.lineTo(width - 18 * scale, 18 * scale + bracketSize);
      ctx.stroke();

      // Bottom-Left Bracket
      ctx.beginPath();
      ctx.moveTo(18 * scale, height - 18 * scale - bracketSize);
      ctx.lineTo(18 * scale, height - 18 * scale);
      ctx.lineTo(18 * scale + bracketSize, height - 18 * scale);
      ctx.stroke();

      // Bottom-Right Bracket
      ctx.beginPath();
      ctx.moveTo(width - 18 * scale - bracketSize, height - 18 * scale);
      ctx.lineTo(width - 18 * scale, height - 18 * scale);
      ctx.lineTo(width - 18 * scale, height - 18 * scale - bracketSize);
      ctx.stroke();

      // Tech HUD Top Labels cleanly inside top header strip
      ctx.fillStyle = 'rgba(34, 211, 238, 0.9)';
      ctx.font = `bold ${14 * scale}px monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText('HUD_V2.4', 56 * scale, 42 * scale);
      ctx.textAlign = 'right';
      ctx.fillText('SECURE_LINK', width - 56 * scale, 42 * scale);

      // Tech HUD Bottom Labels cleanly below title
      ctx.font = `bold ${12 * scale}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('// PROTOCOL_01', 34 * scale, height - 24 * scale);
      ctx.textAlign = 'right';
      ctx.fillText('SECURE_KEY_OK', width - 34 * scale, height - 24 * scale);
      break;
    }

    case 'vip_gold': {
      // Golden Beveled Frame
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.roundRect(14 * scale, 14 * scale, width - 28 * scale, height - 28 * scale, 24 * scale);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(253, 230, 138, 0.6)';
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.roundRect(22 * scale, 22 * scale, width - 44 * scale, height - 44 * scale, 18 * scale);
      ctx.stroke();

      // Star filigree in corners & crown emblem centered in top header strip
      ctx.fillStyle = '#fbbf24';
      ctx.font = `bold ${20 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', 42 * scale, 44 * scale);
      ctx.fillText('★', width - 42 * scale, 44 * scale);
      ctx.fillText('★', 42 * scale, height - 38 * scale);
      ctx.fillText('★', width - 42 * scale, height - 38 * scale);
      ctx.font = `${24 * scale}px sans-serif`;
      ctx.fillText('👑', width / 2, 44 * scale);
      break;
    }

    case 'food_bistro': {
      // Stitched Artisan Dashed Border
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.65)';
      ctx.lineWidth = 2.2 * scale;
      ctx.setLineDash([8 * scale, 6 * scale]);
      ctx.beginPath();
      ctx.roundRect(14 * scale, 14 * scale, width - 28 * scale, height - 28 * scale, 22 * scale);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // Culinary icons cleanly inside top & bottom header strips
      ctx.font = `${22 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍴', 44 * scale, 44 * scale);
      ctx.fillText('🍷', width - 44 * scale, 44 * scale);
      ctx.fillText('🍽️', width / 2, 44 * scale);
      ctx.fillText('🥖', 42 * scale, height - 38 * scale);
      ctx.fillText('☕', width - 42 * scale, height - 38 * scale);
      break;
    }

    case 'party_fun': {
      // Multi-colored Funky Rim
      ctx.strokeStyle = 'rgba(240, 171, 252, 0.65)';
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.roundRect(14 * scale, 14 * scale, width - 28 * scale, height - 28 * scale, 24 * scale);
      ctx.stroke();

      // Festive Colorful Stars & Music Icons cleanly inside top & bottom header strips
      ctx.font = `${22 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎵', 44 * scale, 44 * scale);
      ctx.fillText('🎪', width / 2, 44 * scale);
      ctx.fillText('⭐', width - 44 * scale, 44 * scale);
      ctx.fillText('🎸', 42 * scale, height - 38 * scale);
      ctx.fillText('✨', width - 42 * scale, height - 38 * scale);
      break;
    }

    default:
      break;
  }

  ctx.restore();
};

/**
 * Helper to draw a celebratory balloon with string
 */
function drawBalloon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  scale: number
) {
  // Balloon body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, radius, radius * 1.25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Highlight gleam
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.ellipse(x - radius * 0.35, y - radius * 0.4, radius * 0.3, radius * 0.4, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Knot
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 3 * scale, y + radius * 1.25);
  ctx.lineTo(x + 3 * scale, y + radius * 1.25);
  ctx.lineTo(x, y + radius * 1.25 + 4 * scale);
  ctx.closePath();
  ctx.fill();

  // String
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 1.4 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y + radius * 1.25 + 4 * scale);
  ctx.quadraticCurveTo(x + 5 * scale, y + radius * 1.25 + 14 * scale, x - 2 * scale, y + radius * 1.25 + 26 * scale);
  ctx.stroke();
}
