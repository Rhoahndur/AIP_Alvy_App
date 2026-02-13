import type { FieldComparisonResult } from '@/lib/types/matching';
import { fuzzyMatch } from './fuzzy-matcher';

function extractNumericValue(text: string): number | null {
  const match = text.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : null;
}

function normalizeToMl(value: number, unit: string): number {
  const u = unit.toLowerCase().replace(/[.\s]/g, '');
  if (u === 'l') return value * 1000;
  if (u.includes('floz') || u.includes('oz')) return value * 29.5735;
  return value; // assume mL
}

function extractUnit(text: string): string {
  const match = text.match(/(mL|ml|L|l|FL\.?\s*OZ\.?|fl\.?\s*oz\.?)/i);
  return match ? match[1] : 'mL';
}

export function numericMatch(
  fieldName: string,
  expected: string,
  extracted: string | null,
  tolerancePercent: number
): FieldComparisonResult {
  if (!extracted || extracted.trim() === '') {
    return {
      fieldName,
      expected,
      extracted: null,
      result: 'NOT_FOUND',
      confidence: 0,
      details: 'Field not found in label',
    };
  }

  const expectedNum = extractNumericValue(expected);
  const extractedNum = extractNumericValue(extracted);

  if (expectedNum === null || extractedNum === null) {
    // Fall back to fuzzy string matching if we can't parse numbers
    return fuzzyMatch(fieldName, expected, extracted);
  }

  // For net contents, normalize units to mL for comparison
  if (fieldName === 'netContents') {
    const expectedUnit = extractUnit(expected);
    const extractedUnit = extractUnit(extracted);
    const expectedMl = normalizeToMl(expectedNum, expectedUnit);
    const extractedMl = normalizeToMl(extractedNum, extractedUnit);
    const diff = Math.abs(expectedMl - extractedMl);

    if (diff < 1) {
      return { fieldName, expected, extracted, result: 'MATCH', confidence: 1.0 };
    }

    const confidence = Math.max(0, 1 - diff / expectedMl);
    return {
      fieldName,
      expected,
      extracted,
      result: confidence >= 0.95 ? 'MATCH' : 'MISMATCH',
      confidence,
      details: `Volume difference: ${diff.toFixed(1)} mL`,
    };
  }

  // For alcohol content, compare percentage points
  const diff = Math.abs(expectedNum - extractedNum);
  if (diff <= tolerancePercent) {
    const confidence = 1 - diff / (tolerancePercent * 3);
    return {
      fieldName,
      expected,
      extracted,
      result: 'MATCH',
      confidence: Math.min(1, Math.max(0, confidence)),
    };
  }

  const confidence = Math.max(0, 1 - diff / expectedNum);
  return {
    fieldName,
    expected,
    extracted,
    result: 'MISMATCH',
    confidence,
    details: `Alcohol content differs by ${diff.toFixed(1)} percentage points (tolerance: ±${tolerancePercent})`,
  };
}
