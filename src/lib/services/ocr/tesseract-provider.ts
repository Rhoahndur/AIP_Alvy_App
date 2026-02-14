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

function extractWords(data: Tesseract.RecognizeResult['data']) {
  const words: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }> = [];
  for (const block of data.blocks || []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        for (const word of line.words) {
          words.push(word);
        }
      }
    }
  }
  return words;
}

export class TesseractOCRProvider implements OCRProvider {
  async extractText(imageBuffer: Buffer): Promise<OCRResult> {
    const preprocessed = await preprocessImage(imageBuffer);
    const worker = await getWorker();

    // Pass 1: PSM 3 (auto) — good for structured text (paragraphs, addresses, warnings)
    await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO });
    const primary = await worker.recognize(preprocessed);

    // Pass 2: PSM 11 (sparse text) — catches isolated text PSM 3 misses
    // (standalone years, large brand names, scattered label elements)
    await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT });
    const sparse = await worker.recognize(preprocessed);

    // Use primary text as the main output (preserves reading order),
    // append unique sparse-only lines as supplemental text
    const primaryLines = new Set(
      primary.data.text.split('\n').map((l) => l.trim().toLowerCase()).filter(Boolean)
    );
    const sparseOnlyLines = sparse.data.text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !primaryLines.has(l.toLowerCase()));

    const mergedText = sparseOnlyLines.length > 0
      ? primary.data.text.trimEnd() + '\n' + sparseOnlyLines.join('\n')
      : primary.data.text;

    const words = extractWords(primary.data);
    const regions: TextRegion[] = words.map((word) => ({
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
      rawText: mergedText,
      confidence: primary.data.confidence / 100,
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
