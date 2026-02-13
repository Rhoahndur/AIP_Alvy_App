import { describe, it, expect } from 'vitest';
import { numericMatch } from '@/lib/services/matching/numeric-matcher';
import { SPIRITS_ABV_TOLERANCE, WINE_ABV_TOLERANCE } from '@/lib/constants';

describe('numericMatch — Alcohol Content', () => {
  it('returns MATCH for identical ABV', () => {
    const result = numericMatch('alcoholContent', '45% Alc./Vol.', '45% Alc./Vol.', SPIRITS_ABV_TOLERANCE);
    expect(result.result).toBe('MATCH');
  });

  it('returns MATCH within spirits tolerance (±0.3%)', () => {
    const result = numericMatch('alcoholContent', '45% Alc./Vol.', '44.8% Alc./Vol.', SPIRITS_ABV_TOLERANCE);
    expect(result.result).toBe('MATCH');
  });

  it('returns MISMATCH outside spirits tolerance', () => {
    const result = numericMatch('alcoholContent', '45% Alc./Vol.', '40% Alc./Vol.', SPIRITS_ABV_TOLERANCE);
    expect(result.result).toBe('MISMATCH');
    expect(result.details).toContain('5.0 percentage points');
  });

  it('returns MATCH within wine tolerance (±1.5%)', () => {
    const result = numericMatch('alcoholContent', '13.5% Alc./Vol.', '12.5% Alc./Vol.', WINE_ABV_TOLERANCE);
    expect(result.result).toBe('MATCH');
  });

  it('returns MISMATCH outside wine tolerance', () => {
    const result = numericMatch('alcoholContent', '13.5% Alc./Vol.', '10% Alc./Vol.', WINE_ABV_TOLERANCE);
    expect(result.result).toBe('MISMATCH');
  });

  it('returns NOT_FOUND when extracted is null', () => {
    const result = numericMatch('alcoholContent', '45%', null, SPIRITS_ABV_TOLERANCE);
    expect(result.result).toBe('NOT_FOUND');
  });
});

describe('numericMatch — Net Contents', () => {
  it('returns MATCH for identical net contents', () => {
    const result = numericMatch('netContents', '750 mL', '750 mL', 0);
    expect(result.result).toBe('MATCH');
  });

  it('returns MATCH for mL vs ml case difference', () => {
    const result = numericMatch('netContents', '750 mL', '750 ml', 0);
    expect(result.result).toBe('MATCH');
  });

  it('handles FL OZ unit', () => {
    // 12 FL OZ = ~354.882 mL
    const result = numericMatch('netContents', '12 FL OZ', '12 FL OZ', 0);
    expect(result.result).toBe('MATCH');
  });

  it('returns MISMATCH for different volumes', () => {
    const result = numericMatch('netContents', '750 mL', '375 mL', 0);
    expect(result.result).toBe('MISMATCH');
  });

  it('returns NOT_FOUND when extracted is empty', () => {
    const result = numericMatch('netContents', '750 mL', '', 0);
    expect(result.result).toBe('NOT_FOUND');
  });
});
