import Tesseract from 'tesseract.js';
import type { OCRProvider, OCRResult, TextRegion } from '@/lib/types/ocr';
import { preprocessImage, preprocessImageUnpadded } from './preprocessor';

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
    const worker = await getWorker();

    // Pass 1: Standard preprocessing WITH padding + PSM AUTO
    // Padding fixes character-level misreads near edges ("o"→"a") but may
    // cause Tesseract to skip faint/small text that touches the border.
    const padded = await preprocessImage(imageBuffer);
    await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO });
    const primary = await worker.recognize(padded);

    // Pass 2: Standard preprocessing WITHOUT padding + PSM AUTO
    // Recovers faint text (e.g., light address lines on dark backgrounds)
    // that the padded pass drops due to segmentation changes.
    const unpadded = await preprocessImageUnpadded(imageBuffer);
    await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO });
    const recovery = await worker.recognize(unpadded);

    // Merge: padded pass is primary (better character accuracy),
    // append unique lines from recovery pass as supplemental text
    const primaryLines = new Set(
      primary.data.text.split('\n').map((l) => l.trim().toLowerCase()).filter(Boolean)
    );
    const recoveryOnlyLines = recovery.data.text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !primaryLines.has(l.toLowerCase()));

    const mergedText = recoveryOnlyLines.length > 0
      ? primary.data.text.trimEnd() + '\n' + recoveryOnlyLines.join('\n')
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
