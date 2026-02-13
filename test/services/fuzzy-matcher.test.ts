import { describe, it, expect } from 'vitest';
import { fuzzyMatch } from '@/lib/services/matching/fuzzy-matcher';

describe('fuzzyMatch', () => {
  it('returns MATCH for identical strings', () => {
    const result = fuzzyMatch('brandName', 'OLD TOM DISTILLERY', 'OLD TOM DISTILLERY');
    expect(result.result).toBe('MATCH');
    expect(result.confidence).toBe(1.0);
  });

  it('returns MATCH for case-insensitive identical strings', () => {
    const result = fuzzyMatch('brandName', 'OLD TOM DISTILLERY', 'old tom distillery');
    expect(result.result).toBe('MATCH');
    expect(result.confidence).toBe(1.0);
  });

  it('returns MATCH for very similar strings (>= 0.95 similarity)', () => {
    const result = fuzzyMatch('classType', 'Kentucky Straight Bourbon Whiskey', 'Kentucky Straight Bourbon Whisky');
    expect(result.result).toBe('MATCH');
    expect(result.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('returns PARTIAL for moderately similar strings (>= 0.75 similarity)', () => {
    const result = fuzzyMatch('brandName', "STONE'S THROW BREWING", "Stone's Throw Brew");
    expect(result.result).toBe('PARTIAL');
    expect(result.confidence).toBeGreaterThanOrEqual(0.75);
    expect(result.confidence).toBeLessThan(0.95);
  });

  it('returns MISMATCH for very different strings', () => {
    const result = fuzzyMatch('brandName', 'OLD TOM DISTILLERY', 'WILLAMETTE RESERVE');
    expect(result.result).toBe('MISMATCH');
    expect(result.confidence).toBeLessThan(0.75);
  });

  it('returns NOT_FOUND when extracted is null', () => {
    const result = fuzzyMatch('appellation', 'Willamette Valley', null);
    expect(result.result).toBe('NOT_FOUND');
    expect(result.confidence).toBe(0);
  });

  it('returns NOT_FOUND when extracted is empty string', () => {
    const result = fuzzyMatch('varietal', 'Pinot Noir', '   ');
    expect(result.result).toBe('NOT_FOUND');
    expect(result.confidence).toBe(0);
  });

  it('normalizes whitespace', () => {
    const result = fuzzyMatch('nameAddress', 'Old Tom Distillery, Louisville, KY', 'Old Tom  Distillery,  Louisville,  KY');
    expect(result.result).toBe('MATCH');
  });
});
