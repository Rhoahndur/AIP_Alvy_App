/**
 * Benchmark: Compare OCR model quality and timing.
 *
 * Tests the current best_int model vs full-float tessdata_best,
 * with and without image padding, on all 9 test label images.
 *
 * Run: npx tsx test/benchmark-ocr-models.ts
 */

import Tesseract from 'tesseract.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { preprocessImage, preprocessImageEnhanced } from '../src/lib/services/ocr/preprocessor';

const IMAGE_DIR = join(__dirname, 'images');
const IMAGES = [
  'S1_bourbon_clean.png',
  'S2_bourbon_fail.png',
  'S3_bourbon_degraded.png',
  'W1_wine_clean.png',
  'W2_wine_fail.png',
  'W3_wine_degraded.png',
  'M1_beer_clean.png',
  'M2_beer_fail.png',
  'M3_beer_degraded.png',
];

// The government warning snippet we're checking for "not" vs "nat"
const WARNING_SNIPPET = 'should not drink';

interface ModelConfig {
  name: string;
  langPath?: string;
  gzip?: boolean;
}

const MODELS: ModelConfig[] = [
  {
    name: 'best_int (current default)',
    // No langPath — uses default CDN which resolves to 4.0.0_best_int for LSTM_ONLY
  },
  {
    name: 'tessdata_best (full float)',
    langPath: 'https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata_best@main',
    gzip: false,
  },
];

async function addPadding(buffer: Buffer, pixels: number = 20): Promise<Buffer> {
  return sharp(buffer)
    .extend({
      top: pixels,
      bottom: pixels,
      left: pixels,
      right: pixels,
      background: { r: 255, g: 255, b: 255 },
    })
    .png()
    .toBuffer();
}

async function runDualPassOCR(
  worker: Tesseract.Worker,
  imageBuffer: Buffer,
  withPadding: boolean,
): Promise<{ text: string; timeMs: number }> {
  const start = Date.now();

  // Pass 1: Standard preprocessing + PSM AUTO
  let standard = await preprocessImage(imageBuffer);
  if (withPadding) standard = await addPadding(standard);
  await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO });
  const primary = await worker.recognize(standard);

  // Pass 2: Enhanced preprocessing + PSM SPARSE_TEXT
  let enhanced = await preprocessImageEnhanced(imageBuffer);
  if (withPadding) enhanced = await addPadding(enhanced);
  await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT });
  const sparse = await worker.recognize(enhanced);

  // Merge (same logic as tesseract-provider.ts)
  const primaryLines = new Set(
    primary.data.text.split('\n').map((l) => l.trim().toLowerCase()).filter(Boolean),
  );
  const sparseOnlyLines = sparse.data.text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !primaryLines.has(l.toLowerCase()));

  const mergedText = sparseOnlyLines.length > 0
    ? primary.data.text.trimEnd() + '\n' + sparseOnlyLines.join('\n')
    : primary.data.text;

  return { text: mergedText, timeMs: Date.now() - start };
}

function checkWarningAccuracy(text: string): { hasCorrectNot: boolean; hasNat: boolean; warningFound: boolean } {
  const lower = text.toLowerCase();
  return {
    warningFound: lower.includes('government warning'),
    hasCorrectNot: lower.includes('should not drink'),
    hasNat: lower.includes('should nat drink') || lower.includes('nat drink'),
  };
}

async function main() {
  console.log('='.repeat(80));
  console.log('OCR Model Benchmark — Comparing tessdata_best_int vs tessdata_best (full float)');
  console.log('With and without 20px white padding');
  console.log('='.repeat(80));
  console.log();

  for (const model of MODELS) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`MODEL: ${model.name}`);
    console.log(`${'─'.repeat(80)}`);

    const workerOpts: Partial<Tesseract.WorkerOptions> = {};
    if (model.langPath) {
      workerOpts.langPath = model.langPath;
      workerOpts.gzip = model.gzip ?? true;
    }

    console.log('Initializing worker (includes model download on first run)...');
    const initStart = Date.now();
    const worker = await Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY, workerOpts);
    console.log(`Worker ready in ${Date.now() - initStart}ms\n`);

    for (const withPadding of [false, true]) {
      const paddingLabel = withPadding ? '+ 20px padding' : 'no padding';
      console.log(`  --- ${paddingLabel} ---`);

      const times: number[] = [];

      for (const imgName of IMAGES) {
        const imgBuffer = readFileSync(join(IMAGE_DIR, imgName));
        const { text, timeMs } = await runDualPassOCR(worker, imgBuffer, withPadding);
        times.push(timeMs);

        const warn = checkWarningAccuracy(text);
        const notStatus = warn.hasCorrectNot ? '"not" OK' : warn.hasNat ? '"nat" FOUND' : 'warning unclear';
        const under5s = timeMs < 5000 ? 'OK' : 'OVER';

        console.log(
          `  ${imgName.padEnd(28)} ${String(timeMs).padStart(5)}ms [${under5s}]  ${notStatus}  conf:${warn.warningFound ? 'yes' : 'no'}`,
        );
      }

      const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      const max = Math.max(...times);
      console.log(`  ${'SUMMARY'.padEnd(28)} avg=${avg}ms  max=${max}ms  all<5s=${max < 5000 ? 'YES' : 'NO'}\n`);
    }

    await worker.terminate();
  }

  console.log('\n' + '='.repeat(80));
  console.log('Benchmark complete.');
}

main().catch(console.error);
