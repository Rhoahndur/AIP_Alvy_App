import { describe, it, expect } from 'vitest';
import { preprocessImage } from '@/lib/services/ocr/preprocessor';
import { parseFieldsFromText } from '@/lib/services/parser/field-parser';
import { AlgorithmicMatchingEngine } from '@/lib/services/matching/matching-engine';
import type { ApplicationFields } from '@/lib/types/matching';
import { GOVERNMENT_WARNING_TEXT } from '@/lib/constants';
import sharp from 'sharp';

const engine = new AlgorithmicMatchingEngine();

async function createLabelImage(width = 1200, height = 800): Promise<Buffer> {
  // Create a synthetic test image — real OCR test requires actual label images
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 240, g: 240, b: 240 },
    },
  }).png().toBuffer();
}

describe('Performance: Sub-5-second requirement', () => {
  it('image preprocessing completes in < 1 second', async () => {
    const img = await createLabelImage(3000, 2000);
    const start = Date.now();
    await preprocessImage(img);
    const elapsed = Date.now() - start;

    console.log(`Preprocessing time: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(1000);
  });

  it('field parsing completes in < 10ms', () => {
    const ocrText = `OLD TOM DISTILLERY
Kentucky Straight Bourbon Whiskey
45% Alc./Vol. (90 Proof)
750 mL
GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.
Old Tom Distillery, 1234 Barrel Lane, Louisville, KY 40202`;

    const start = Date.now();
    parseFieldsFromText(ocrText);
    const elapsed = Date.now() - start;

    console.log(`Parser time: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(10);
  });

  it('matching engine completes in < 10ms', () => {
    const extracted = {
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholContent: '45% Alc./Vol. (90 Proof)',
      netContents: '750 mL',
      nameAddress: 'Old Tom Distillery, 1234 Barrel Lane, Louisville, KY 40202',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      countryOfOrigin: null,
      appellation: null,
      varietal: null,
      vintageDate: null,
    };

    const appData: ApplicationFields = {
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholContent: '45% Alc./Vol. (90 Proof)',
      netContents: '750 mL',
      nameAddress: 'Old Tom Distillery, 1234 Barrel Lane, Louisville, KY 40202',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      countryOfOrigin: null,
      appellation: null,
      varietal: null,
      vintageDate: null,
    };

    const start = Date.now();
    engine.compareFields(extracted, appData, 'SPIRITS');
    const elapsed = Date.now() - start;

    console.log(`Matching time: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(10);
  });

  it('preprocess + parse + match pipeline (excluding OCR) completes in < 2 seconds', async () => {
    const img = await createLabelImage(2000, 1500);

    const start = Date.now();

    // Step 1: Preprocess
    await preprocessImage(img);

    // Step 2: Parse (simulate OCR output — actual OCR tested separately)
    const ocrText = `OLD TOM DISTILLERY
Kentucky Straight Bourbon Whiskey
45% Alc./Vol. (90 Proof)
750 mL
GOVERNMENT WARNING: full text here
Old Tom Distillery, Louisville, KY 40202`;

    const parsed = parseFieldsFromText(ocrText);

    // Step 3: Match
    const appData: ApplicationFields = {
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholContent: '45% Alc./Vol. (90 Proof)',
      netContents: '750 mL',
      nameAddress: 'Old Tom Distillery, Louisville, KY 40202',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      countryOfOrigin: null,
      appellation: null,
      varietal: null,
      vintageDate: null,
    };

    engine.compareFields(parsed, appData, 'SPIRITS');

    const elapsed = Date.now() - start;
    console.log(`Pipeline (minus OCR) time: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(2000);
  });
});
