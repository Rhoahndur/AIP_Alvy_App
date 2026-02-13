import type { FieldComparisonResult } from '@/lib/types/matching';
import { MATCH_THRESHOLD, PARTIAL_THRESHOLD } from '@/lib/constants';
import { levenshteinDistance } from './levenshtein';

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function fuzzyMatch(
  fieldName: string,
  expected: string,
  extracted: string | null
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

  const normExpected = normalize(expected);
  const normExtracted = normalize(extracted);

  if (normExpected === normExtracted) {
    return {
      fieldName,
      expected,
      extracted,
      result: 'MATCH',
      confidence: 1.0,
    };
  }

  const dist = levenshteinDistance(normExpected, normExtracted);
  const maxLen = Math.max(normExpected.length, normExtracted.length);
  const confidence = maxLen > 0 ? 1 - dist / maxLen : 0;

  if (confidence >= MATCH_THRESHOLD) {
    return { fieldName, expected, extracted, result: 'MATCH', confidence };
  }

  if (confidence >= PARTIAL_THRESHOLD) {
    return {
      fieldName,
      expected,
      extracted,
      result: 'PARTIAL',
      confidence,
      details: `Partial match (${Math.round(confidence * 100)}% similar)`,
    };
  }

  return {
    fieldName,
    expected,
    extracted,
    result: 'MISMATCH',
    confidence,
    details: `Low similarity (${Math.round(confidence * 100)}%)`,
  };
}
