import { describe, it, expect } from 'vitest';
import { exactMatch } from '@/lib/services/matching/exact-matcher';
import { GOVERNMENT_WARNING_TEXT } from '@/lib/constants';

describe('exactMatch (Government Warning)', () => {
  it('returns MATCH for identical all-caps government warning', () => {
    const result = exactMatch('governmentWarning', GOVERNMENT_WARNING_TEXT, GOVERNMENT_WARNING_TEXT);
    expect(result.result).toBe('MATCH');
    expect(result.confidence).toBe(1.0);
  });

  it('returns NOT_FOUND when extracted is null', () => {
    const result = exactMatch('governmentWarning', GOVERNMENT_WARNING_TEXT, null);
    expect(result.result).toBe('NOT_FOUND');
    expect(result.confidence).toBe(0);
  });

  it('returns MISMATCH when prefix is not all caps', () => {
    const titleCase = GOVERNMENT_WARNING_TEXT.replace('GOVERNMENT WARNING', 'Government Warning');
    const result = exactMatch('governmentWarning', GOVERNMENT_WARNING_TEXT, titleCase);
    expect(result.result).toBe('MISMATCH');
    expect(result.details).toContain('not in all caps');
  });

  it('returns MISMATCH for different warning text', () => {
    const different = 'GOVERNMENT WARNING: Some completely different text here.';
    const result = exactMatch('governmentWarning', GOVERNMENT_WARNING_TEXT, different);
    expect(result.result).toBe('MISMATCH');
    expect(result.confidence).toBeLessThan(1.0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('normalizes whitespace before comparison', () => {
    const withExtraSpaces = GOVERNMENT_WARNING_TEXT.replace('women should', 'women  should');
    const result = exactMatch('governmentWarning', GOVERNMENT_WARNING_TEXT, withExtraSpaces);
    expect(result.result).toBe('MATCH');
  });

  it('returns NOT_FOUND for empty string', () => {
    const result = exactMatch('governmentWarning', GOVERNMENT_WARNING_TEXT, '');
    expect(result.result).toBe('NOT_FOUND');
  });
});
