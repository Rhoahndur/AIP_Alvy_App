import { describe, it, expect } from 'vitest';
import { AlgorithmicMatchingEngine } from '@/lib/services/matching/matching-engine';
import type { ParsedLabelFields, ApplicationFields } from '@/lib/types/matching';
import { GOVERNMENT_WARNING_TEXT } from '@/lib/constants';

const engine = new AlgorithmicMatchingEngine();

const spiritsApp: ApplicationFields = {
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

describe('AlgorithmicMatchingEngine', () => {
  it('returns AUTO_PASS when all fields match for spirits', () => {
    const extracted: ParsedLabelFields = {
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

    const results = engine.compareFields(extracted, spiritsApp, 'SPIRITS');
    const hasFailure = results.some((r) => r.result === 'MISMATCH' || r.result === 'NOT_FOUND');
    expect(hasFailure).toBe(false);
  });

  it('returns MISMATCH for wrong alcohol content', () => {
    const extracted: ParsedLabelFields = {
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholContent: '40% Alc./Vol. (80 Proof)',
      netContents: '750 mL',
      nameAddress: 'Old Tom Distillery, 1234 Barrel Lane, Louisville, KY 40202',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      countryOfOrigin: null,
      appellation: null,
      varietal: null,
      vintageDate: null,
    };

    const results = engine.compareFields(extracted, spiritsApp, 'SPIRITS');
    const abvResult = results.find((r) => r.fieldName === 'alcoholContent');
    expect(abvResult?.result).toBe('MISMATCH');
  });

  it('handles wine-only fields for WINE beverage type', () => {
    const wineApp: ApplicationFields = {
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

    const extracted: ParsedLabelFields = {
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

    const results = engine.compareFields(extracted, wineApp, 'WINE');
    const appellationResult = results.find((r) => r.fieldName === 'appellation');
    const varietalResult = results.find((r) => r.fieldName === 'varietal');
    const vintageResult = results.find((r) => r.fieldName === 'vintageDate');

    expect(appellationResult?.result).toBe('MATCH');
    expect(varietalResult?.result).toBe('MATCH');
    expect(vintageResult?.result).toBe('MATCH');
  });

  it('returns NOT_FOUND for missing vintage date', () => {
    const wineApp: ApplicationFields = {
      brandName: 'WILLAMETTE RESERVE',
      classType: 'Pinot Noir',
      alcoholContent: '13.5% Alc./Vol.',
      netContents: '750 mL',
      nameAddress: 'Willamette Reserve Winery, Dundee, OR 97115',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      countryOfOrigin: null,
      appellation: null,
      varietal: null,
      vintageDate: '2021',
    };

    const extracted: ParsedLabelFields = {
      brandName: 'WILLAMETTE RESERVE',
      classType: 'Pinot Noir',
      alcoholContent: '13.5% Alc./Vol.',
      netContents: '750 mL',
      nameAddress: 'Willamette Reserve Winery, Dundee, OR 97115',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      countryOfOrigin: null,
      appellation: null,
      varietal: null,
      vintageDate: null,
    };

    const results = engine.compareFields(extracted, wineApp, 'WINE');
    const vintage = results.find((r) => r.fieldName === 'vintageDate');
    expect(vintage?.result).toBe('NOT_FOUND');
  });

  it('does not include wine-only fields for SPIRITS', () => {
    const extracted: ParsedLabelFields = {
      brandName: 'OLD TOM DISTILLERY',
      classType: 'Kentucky Straight Bourbon Whiskey',
      alcoholContent: '45% Alc./Vol.',
      netContents: '750 mL',
      nameAddress: 'Old Tom Distillery, Louisville, KY 40202',
      governmentWarning: GOVERNMENT_WARNING_TEXT,
      countryOfOrigin: null,
      appellation: 'Willamette Valley',
      varietal: 'Pinot Noir',
      vintageDate: '2021',
    };

    const results = engine.compareFields(extracted, spiritsApp, 'SPIRITS');
    const fieldNames = results.map((r) => r.fieldName);
    expect(fieldNames).not.toContain('appellation');
    expect(fieldNames).not.toContain('varietal');
    expect(fieldNames).not.toContain('vintageDate');
  });
});
