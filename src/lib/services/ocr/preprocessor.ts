import sharp from 'sharp';
import { MAX_IMAGE_WIDTH } from '@/lib/constants';

/**
 * Standard preprocessing — gentle, preserves text fidelity.
 * Used for the primary OCR pass (PSM 3 structured reading).
 */
export async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize({
      width: MAX_IMAGE_WIDTH,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.0 })
    .png()
    .toBuffer();
}

/**
 * Enhanced preprocessing — CLAHE + auto-invert for difficult text.
 * Used for the sparse OCR pass to catch text the primary pass misses
 * (e.g., white text on dark backgrounds, large isolated text).
 */
export async function preprocessImageEnhanced(imageBuffer: Buffer): Promise<Buffer> {
  const grayscale = await sharp(imageBuffer)
    .resize({
      width: MAX_IMAGE_WIDTH,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .grayscale()
    .toBuffer();

  const enhanced = await sharp(grayscale)
    .clahe({ width: 3, height: 3 })
    .normalize()
    .toBuffer();

  // Auto-invert if image is predominantly dark (light text on dark bg)
  const { channels } = await sharp(enhanced).stats();
  const meanBrightness = channels[0].mean;

  const final = meanBrightness < 128
    ? await sharp(enhanced).negate().toBuffer()
    : enhanced;

  return sharp(final)
    .sharpen({ sigma: 1.0 })
    .png()
    .toBuffer();
}
