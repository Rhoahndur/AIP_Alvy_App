import Tesseract from 'tesseract.js';
import type { OCRProvider, OCRResult, TextRegion } from '@/lib/types/ocr';
import { preprocessImage } from './preprocessor';

let workerPromise: Promise<Tesseract.Worker> | null = null;

function getWorker(): Promise<Tesseract.Worker> {
  if (!workerPromise) {
    workerPromise = Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY);
  }
  return workerPromise;
}

export class TesseractOCRProvider implements OCRProvider {
  async extractText(imageBuffer: Buffer): Promise<OCRResult> {
    const preprocessed = await preprocessImage(imageBuffer);
    const worker = await getWorker();
    const { data } = await worker.recognize(preprocessed);

    const regions: TextRegion[] = (data.words || []).map((word) => ({
      text: word.text,
      confidence: word.confidence / 100,
      bbox: {
        x0: word.bbox.x0,
        y0: word.bbox.y0,
        x1: word.bbox.x1,
        y1: word.bbox.y1,
      },
    }));

    return {
      rawText: data.text,
      confidence: data.confidence / 100,
      regions,
    };
  }

  async terminate(): Promise<void> {
    if (workerPromise) {
      const worker = await workerPromise;
      await worker.terminate();
      workerPromise = null;
    }
  }
}
