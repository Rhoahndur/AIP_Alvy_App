import { put, del } from '@vercel/blob';
import type { StorageProvider } from '@/lib/types/storage';
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from '@/lib/constants';

export class VercelBlobProvider implements StorageProvider {
  async uploadImage(file: Buffer, filename: string, contentType: string): Promise<string> {
    if (!ACCEPTED_IMAGE_TYPES.includes(contentType as typeof ACCEPTED_IMAGE_TYPES[number])) {
      throw new Error(`Invalid file type: ${contentType}. Accepted types: ${ACCEPTED_IMAGE_TYPES.join(', ')}`);
    }

    if (file.length > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(`File too large: ${(file.length / 1024 / 1024).toFixed(1)}MB. Maximum: ${(MAX_IMAGE_SIZE_BYTES / 1024 / 1024).toFixed(1)}MB`);
    }

    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${filename}`;

    const blob = await put(uniqueFilename, file, {
      access: 'public',
      contentType,
    });

    return blob.url;
  }

  async getImageUrl(url: string): Promise<string> {
    return url;
  }

  async deleteImage(url: string): Promise<void> {
    await del(url);
  }
}
