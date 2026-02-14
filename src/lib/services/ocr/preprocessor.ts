import sharp from 'sharp';
import { MAX_IMAGE_WIDTH } from '@/lib/constants';

export async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  // Step 1: Resize + grayscale
  const grayscale = await sharp(imageBuffer)
    .resize({
      width: MAX_IMAGE_WIDTH,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .grayscale()
    .toBuffer();

  // Step 2: CLAHE (local adaptive contrast enhancement) — handles mixed regions
  // like white text on dark background AND dark text on light background
  const enhanced = await sharp(grayscale)
    .clahe({ width: 3, height: 3 })
    .normalize()
    .toBuffer();

  // Step 3: Auto-detect if image is predominantly dark (light text on dark bg)
  // and invert if needed — Tesseract works best with dark text on light bg
  const { channels } = await sharp(enhanced).stats();
  const meanBrightness = channels[0].mean;

  let final = enhanced;
  if (meanBrightness < 128) {
    // Image is mostly dark → likely light text on dark bg → invert
    final = await sharp(enhanced).negate().toBuffer();
  }

  // Step 4: Gentle sharpen + output
  return sharp(final)
    .sharpen({ sigma: 1.0 })
    .png()
    .toBuffer();
}
