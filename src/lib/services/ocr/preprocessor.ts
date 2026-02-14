import sharp from 'sharp';
import { OCR_IMAGE_WIDTH } from '@/lib/constants';

/** White border padding (px) added around preprocessed images for OCR.
 *  Prevents Tesseract segmentation errors when text is near image edges,
 *  which fixes character-level misreads (e.g., "o" → "a") on small text. */
const OCR_PADDING_PX = 20;

/**
 * Standard preprocessing WITH padding — resize + sharpen + normalize + pad.
 * Used for the primary OCR pass. Padding fixes character-level misreads
 * but may cause Tesseract to skip faint/small text near edges.
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
    .extend({
      top: OCR_PADDING_PX,
      bottom: OCR_PADDING_PX,
      left: OCR_PADDING_PX,
      right: OCR_PADDING_PX,
      background: { r: 255, g: 255, b: 255 },
    })
    .png()
    .toBuffer();
}

/**
 * Standard preprocessing WITHOUT padding — resize + sharpen + normalize.
 * Used as a recovery pass to catch faint text (e.g., light address lines
 * on dark backgrounds) that the padded pass drops due to segmentation changes.
 */
export async function preprocessImageUnpadded(imageBuffer: Buffer): Promise<Buffer> {
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
