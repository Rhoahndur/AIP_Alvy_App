import { describe, it, expect } from 'vitest';
import { parseFieldsFromText } from '@/lib/services/parser/field-parser';
import { AlgorithmicMatchingEngine } from '@/lib/services/matching/matching-engine';
import type { ApplicationFields } from '@/lib/types/matching';
import { GOVERNMENT_WARNING_TEXT } from '@/lib/constants';

const engine = new AlgorithmicMatchingEngine();

describe('Pipeline Integration: OCR text → parse → match', () => {
  it('spirits label: clean OCR text produces all-match result', () => {
    const ocrText = `OLD TOM DISTILLERY
Kentucky Straight Bourbon Whiskey
45% Alc./Vol. (90 Proof)
750 mL

GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.

Old Tom Distillery, 1234 Barrel Lane, Louisville, KY 40202`;

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

    const parsed = parseFieldsFromText(ocrText);
    const results = engine.compareFields(parsed, appData, 'SPIRITS');

    // All fields should match or be high confidence
    const failures = results.filter((r) => r.result === 'MISMATCH' || r.result === 'NOT_FOUND');
    expect(failures.length).toBe(0);
  });

  it('wine label: clean OCR text with wine-specific fields', () => {
    const ocrText = `WILLAMETTE RESERVE
Pinot Noir
2021
Willamette Valley
13.5% Alc./Vol.
750 mL

GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.

Willamette Reserve Winery, 567 Vine Road, Dundee, OR 97115`;

    const appData: ApplicationFields = {
      brandName: 'WILLAMETTE RESERVE',
      classType: 'Pinot Noir',
      alcoholContent: '13.5% Alc./Vol.',
      netContents: '750 mL',
      nameAddress: 'Willamette Reserve Winery, 567 Vine Road, Dundee, OR 97115',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      countryOfOrigin: null,
      appellation: 'Willamette Valley',
      varietal: 'Pinot Noir',
      vintageDate: '2021',
    };

    const parsed = parseFieldsFromText(ocrText);
    const results = engine.compareFields(parsed, appData, 'WINE');

    // Vintage should match
    const vintage = results.find((r) => r.fieldName === 'vintageDate');
    expect(vintage?.result).toBe('MATCH');
  });

  it('malt beverage: clean OCR text', () => {
    const ocrText = `STONE'S THROW BREWING
India Pale Ale
6.8% Alc./Vol.
12 FL OZ

GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.

Stone's Throw Brewing Co., 890 Hop Street, Portland, OR 97209`;

    const appData: ApplicationFields = {
      brandName: "STONE'S THROW BREWING",
      classType: 'India Pale Ale',
      alcoholContent: '6.8% Alc./Vol.',
      netContents: '12 FL OZ',
      nameAddress: "Stone's Throw Brewing Co., 890 Hop Street, Portland, OR 97209",
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      countryOfOrigin: null,
      appellation: null,
      varietal: null,
      vintageDate: null,
    };

    const parsed = parseFieldsFromText(ocrText);
    const results = engine.compareFields(parsed, appData, 'MALT_BEVERAGE');

    const failures = results.filter((r) => r.result === 'MISMATCH' || r.result === 'NOT_FOUND');
    expect(failures.length).toBe(0);
  });

  it('spirits label with ABV mismatch produces failure', () => {
    // Label shows 40% but application says 45%
    const ocrText = `OLD TOM DISTILLERY
Kentucky Straight Bourbon Whiskey
40% Alc./Vol. (80 Proof)
750 mL

GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.

Old Tom Distillery, 1234 Barrel Lane, Louisville, KY 40202`;

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

    const parsed = parseFieldsFromText(ocrText);
    const results = engine.compareFields(parsed, appData, 'SPIRITS');

    const abvResult = results.find((r) => r.fieldName === 'alcoholContent');
    expect(abvResult?.result).toBe('MISMATCH');
  });
});
