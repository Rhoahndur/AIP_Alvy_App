import type { OCRProvider } from '@/lib/types/ocr';
import { TesseractOCRProvider } from './tesseract-provider';

export { preprocessImage, preprocessImageUnpadded } from './preprocessor';
export { TesseractOCRProvider } from './tesseract-provider';

const defaultProvider = new TesseractOCRProvider();
export default defaultProvider;

export function createOCRProvider(type: 'tesseract' = 'tesseract'): OCRProvider {
  switch (type) {
    case 'tesseract':
      return new TesseractOCRProvider();
    default:
      return new TesseractOCRProvider();
  }
}
