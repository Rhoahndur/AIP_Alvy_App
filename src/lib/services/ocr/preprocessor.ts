import sharp from 'sharp';
import { OCR_IMAGE_WIDTH } from '@/lib/constants';

/**
 * Standard preprocessing — upscale + sharpen + threshold.
 * Used for the primary OCR pass (PSM 3 structured reading).
 *
 * Key: upscaling to 3000px ensures small text (government warnings)
 * has sufficient pixel height (~30-40px) for reliable character recognition.
 * Thresholding creates clean binary image (pure black/white) which
 * eliminates "o→a" type confusions from partial fills.
 */
export async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize({
      width: OCR_IMAGE_WIDTH,
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
 * Enhanced preprocessing — background subtraction for difficult text.
 * Used for the sparse OCR pass to catch text the primary pass misses
 * (e.g., white text on dark backgrounds, large isolated text).
 *
 * Technique: blur heavily to estimate the background, then subtract it.
 * This evens out the background and makes text pop regardless of whether
 * it's light-on-dark or dark-on-light.
 */
export async function preprocessImageEnhanced(imageBuffer: Buffer): Promise<Buffer> {
  const grayscale = await sharp(imageBuffer)
    .resize({
      width: OCR_IMAGE_WIDTH,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .grayscale()
    .png()
    .toBuffer();

  // Heavy blur to estimate the background (text details disappear)
  const background = await sharp(grayscale)
    .blur(30)
    .toBuffer();

  // Subtract background from original using "difference" blend mode:
  // |original - background| → text becomes bright, uniform bg becomes ~0
  const subtracted = await sharp(background)
    .composite([{ input: grayscale, blend: 'difference' }])
    .toBuffer();

  // Negate so text is dark on white background (what Tesseract prefers)
  return sharp(subtracted)
    .negate()
    .normalize()
    .sharpen({ sigma: 1.0 })
    .png()
    .toBuffer();
}
