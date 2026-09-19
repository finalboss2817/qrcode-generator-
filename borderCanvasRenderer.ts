import { QRConfig } from './types';
import { getBorderThemeById } from './borderThemes';

interface CanvasDimensions {
  width: number;
  height: number;
  cardX: number;
  cardY: number;
  cardWidth: number;
  cardHeight: number;
  scale: number;
}

/**
 * Renders high-fidelity theme decorations (balloons, ribbons, laurels, cyber brackets, crowns)
 * onto the 2D export canvas for high-DPI PNGs and copied images.
 */
export const drawThemeDecorationsOnCanvas = (
  ctx: CanvasRenderingContext2D,
  config: QRConfig,
  dim: CanvasDimensions
) => {
  const { width, height, cardX, cardY, cardWidth, cardHeight, scale } = dim;
  const theme = getBorderThemeById(config.borderTheme);
  const bannerText = config.frameBannerText || theme.bannerText;

  // 1. Optional Top Decorative Banner Ribbon
  if (bannerText) {
    const bannerHeight = 28 * scale;
    const bannerY = 16 * scale;
    const bannerWidth = width - 40 * scale;
    const bannerX = 20 * scale;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerWidth, bannerHeight, 8 * scale);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1 * scale;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${12 * scale}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillText(bannerText, width / 2, bannerY + bannerHeight / 2);
  }

  // 2. Theme Specific Ornaments
  switch (config.borderTheme) {
    case 'birthday': {
      // Draw festive confetti dots in the outer frame margins
      const confettiColors = ['#f43f5e', '#fbbf24', '#38bdf8', '#4ade80', '#c084fc'];
      const dots = [
        { x: 18 * scale, y: 70 * scale, r: 6 * scale, c: confettiColors[0] },
        { x: 26 * scale, y: 130 * scale, r: 4 * scale, c: confettiColors[1] },
        { x: 16 * scale, y: height - 80 * scale, r: 5 * scale, c: confettiColors[2] },
        { x: width - 20 * scale, y: 75 * scale, r: 5 * scale, c: confettiColors[3] },
        { x: width - 24 * scale, y: 140 * scale, r: 6 * scale, c: confettiColors[4] },
        { x: width - 18 * scale, y: height - 85 * scale, r: 4.5 * scale, c: confettiColors[0] },
        { x: width / 2 - 80 * scale, y: 52 * scale, r: 4 * scale, c: confettiColors[1] },
        { x: width / 2 + 80 * scale, y: 52 * scale, r: 4 * scale, c: confettiColors[2] },
      ];

      dots.forEach((dot) => {
        ctx.fillStyle = dot.c;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Balloons in top corners
      drawBalloon(ctx, 32 * scale, 58 * scale, 14 * scale, '#f43f5e', scale);
      drawBalloon(ctx, width - 32 * scale, 58 * scale, 14 * scale, '#fbbf24', scale);

      // Cute corner party emojis
      ctx.font = `${20 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🎂', width - 26 * scale, height - 35 * scale);
      break;
    }

    case 'wedding': {
      // Elegant Golden Double Hairline Frame
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.7)';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.roundRect(14 * scale, 14 * scale, width - 28 * scale, height - 28 * scale, 20 * scale);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(253, 230, 138, 0.35)';
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.roundRect(20 * scale, 20 * scale, width - 40 * scale, height - 40 * scale, 16 * scale);
      ctx.stroke();

      // Corner floral glyphs
      ctx.fillStyle = 'rgba(254, 240, 138, 0.9)';
      ctx.font = `${16 * scale}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❦', 28 * scale, 28 * scale);
      ctx.fillText('❧', width - 28 * scale, 28 * scale);
      ctx.fillText('❧', 28 * scale, height - 28 * scale);
      ctx.fillText('❦', width - 28 * scale, height - 28 * scale);
      break;
    }

    case 'cyberpunk': {
      // Tech Neon HUD Brackets
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3 * scale;
      const bracketSize = 24 * scale;

      // Top-Left Bracket
      ctx.beginPath();
      ctx.moveTo(14 * scale, 14 * scale + bracketSize);
      ctx.lineTo(14 * scale, 14 * scale);
      ctx.lineTo(14 * scale + bracketSize, 14 * scale);
      ctx.stroke();

      // Top-Right Bracket
      ctx.beginPath();
      ctx.moveTo(width - 14 * scale - bracketSize, 14 * scale);
      ctx.lineTo(width - 14 * scale, 14 * scale);
      ctx.lineTo(width - 14 * scale, 14 * scale + bracketSize);
      ctx.stroke();

      // Bottom-Left Bracket
      ctx.beginPath();
      ctx.moveTo(14 * scale, height - 14 * scale - bracketSize);
      ctx.lineTo(14 * scale, height - 14 * scale);
      ctx.lineTo(14 * scale + bracketSize, height - 14 * scale);
      ctx.stroke();

      // Bottom-Right Bracket
      ctx.beginPath();
      ctx.moveTo(width - 14 * scale - bracketSize, height - 14 * scale);
      ctx.lineTo(width - 14 * scale, height - 14 * scale);
      ctx.lineTo(width - 14 * scale, height - 14 * scale - bracketSize);
      ctx.stroke();

      // Tech HUD Text
      ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
      ctx.font = `bold ${10 * scale}px monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('// PROTOCOL_01', 20 * scale, height - 24 * scale);
      ctx.textAlign = 'right';
      ctx.fillText('SECURE_KEY_OK', width - 20 * scale, height - 24 * scale);
      break;
    }

    case 'vip_gold': {
      // Golden Beveled Frame
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.roundRect(12 * scale, 12 * scale, width - 24 * scale, height - 24 * scale, 22 * scale);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(253, 230, 138, 0.6)';
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.roundRect(18 * scale, 18 * scale, width - 36 * scale, height - 36 * scale, 18 * scale);
      ctx.stroke();

      // Star filigree in corners
      ctx.fillStyle = '#fbbf24';
      ctx.font = `bold ${16 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', 28 * scale, 28 * scale);
      ctx.fillText('★', width - 28 * scale, 28 * scale);
      ctx.fillText('★', 28 * scale, height - 28 * scale);
      ctx.fillText('★', width - 28 * scale, height - 28 * scale);
      break;
    }

    case 'food_bistro': {
      // Stitched Artisan Dashed Border
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.6)';
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([8 * scale, 6 * scale]);
      ctx.beginPath();
      ctx.roundRect(14 * scale, 14 * scale, width - 28 * scale, height - 28 * scale, 18 * scale);
      ctx.stroke();
      ctx.setLineDash([]); // reset

      // Culinary icons
      ctx.font = `${16 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍴', 28 * scale, 28 * scale);
      ctx.fillText('🍷', width - 28 * scale, 28 * scale);
      break;
    }

    case 'party_fun': {
      // Festive Colorful Stars
      ctx.font = `${16 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⭐', 26 * scale, 30 * scale);
      ctx.fillText('🎵', width - 26 * scale, 30 * scale);
      ctx.fillText('✨', width - 26 * scale, height - 30 * scale);
      ctx.fillText('🎸', 26 * scale, height - 30 * scale);
      break;
    }

    default:
      break;
  }
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
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
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
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y + radius * 1.25 + 4 * scale);
  ctx.quadraticCurveTo(x + 6 * scale, y + radius * 1.25 + 12 * scale, x - 2 * scale, y + radius * 1.25 + 22 * scale);
  ctx.stroke();
}
