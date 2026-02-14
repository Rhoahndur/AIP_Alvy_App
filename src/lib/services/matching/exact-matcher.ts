import type { FieldComparisonResult } from '@/lib/types/matching';
import { GOVERNMENT_WARNING_PREFIX } from '@/lib/constants';
import { levenshteinDistance } from './levenshtein';

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function exactMatch(
  fieldName: string,
  expected: string,
  extracted: string | null
): FieldComparisonResult {
  if (!extracted) {
    return {
      fieldName,
      expected,
      extracted: null,
      result: 'NOT_FOUND',
      confidence: 0,
      details: 'Field not found in label',
    };
  }

  const normalizedExpected = normalizeWhitespace(expected);
  const normalizedExtracted = normalizeWhitespace(extracted);

  // Check if GOVERNMENT WARNING prefix is in all caps
  const prefixPattern = new RegExp(GOVERNMENT_WARNING_PREFIX, 'i');
  const prefixMatch = extracted.match(prefixPattern);
  const isAllCaps = prefixMatch ? prefixMatch[0] === GOVERNMENT_WARNING_PREFIX : false;

  if (normalizedExpected === normalizedExtracted) {
    if (!isAllCaps) {
      return {
        fieldName,
        expected,
        extracted,
        result: 'MISMATCH',
        confidence: 0.8,
        details: '"GOVERNMENT WARNING" is not in all caps',
      };
    }
    return {
      fieldName,
      expected,
      extracted,
      result: 'MATCH',
      confidence: 1.0,
    };
  }

  // Calculate similarity for confidence
  const dist = levenshteinDistance(
    normalizedExpected.toLowerCase(),
    normalizedExtracted.toLowerCase()
  );
  const maxLen = Math.max(normalizedExpected.length, normalizedExtracted.length);
  const similarity = maxLen > 0 ? 1 - dist / maxLen : 0;

  const details: string[] = [];
  if (!isAllCaps) details.push('"GOVERNMENT WARNING" is not in all caps');
  if (similarity < 1) details.push('Warning text does not match exactly');

  return {
    fieldName,
    expected,
    extracted,
    result: 'MISMATCH',
    confidence: similarity,
    details: details.join('; '),
  };
}
