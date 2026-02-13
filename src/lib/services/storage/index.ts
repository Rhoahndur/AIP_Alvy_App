import type { StorageProvider } from '@/lib/types/storage';
import { VercelBlobProvider } from './blob-provider';

export { VercelBlobProvider } from './blob-provider';

const defaultProvider = new VercelBlobProvider();
export default defaultProvider;

export function createStorageProvider(type: 'vercel-blob' = 'vercel-blob'): StorageProvider {
  switch (type) {
    case 'vercel-blob':
      return new VercelBlobProvider();
    default:
      return new VercelBlobProvider();
  }
}
