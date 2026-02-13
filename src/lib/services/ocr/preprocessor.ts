import sharp from 'sharp';
import { MAX_IMAGE_WIDTH } from '@/lib/constants';

export async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize({
      width: MAX_IMAGE_WIDTH,
      withoutEnlargement: true,
      fit: 'inside',
    })
    .grayscale()
    .linear(1.5, -(128 * 1.5 - 128))
    .sharpen()
    .png()
    .toBuffer();
}
