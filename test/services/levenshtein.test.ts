import { describe, it, expect } from 'vitest';
import { levenshteinDistance } from '@/lib/services/matching/levenshtein';

describe('levenshteinDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshteinDistance('hello', 'hello')).toBe(0);
  });

  it('returns 0 for empty strings', () => {
    expect(levenshteinDistance('', '')).toBe(0);
  });

  it('returns length of other string when one is empty', () => {
    expect(levenshteinDistance('abc', '')).toBe(3);
    expect(levenshteinDistance('', 'xyz')).toBe(3);
  });

  it('handles single character difference', () => {
    expect(levenshteinDistance('cat', 'bat')).toBe(1);
  });

  it('handles insertions', () => {
    expect(levenshteinDistance('cat', 'cats')).toBe(1);
  });

  it('handles deletions', () => {
    expect(levenshteinDistance('cats', 'cat')).toBe(1);
  });

  it('handles multiple edits', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
  });

  it('handles completely different strings', () => {
    expect(levenshteinDistance('abc', 'xyz')).toBe(3);
  });
});
