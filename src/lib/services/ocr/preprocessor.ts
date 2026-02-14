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
    .normalize()    // auto-stretch histogram for full contrast range
    .sharpen({ sigma: 1.0 })  // gentle sharpen (default is too aggressive)
    .png()
    .toBuffer();
}
