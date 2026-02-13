import type { MatchingEngine, FieldComparisonResult, ParsedLabelFields, ApplicationFields } from '@/lib/types/matching';
import type { BeverageType } from '@/lib/types/application';
import { SPIRITS_ABV_TOLERANCE, WINE_ABV_TOLERANCE, MALT_ABV_TOLERANCE, WINE_ONLY_FIELDS } from '@/lib/constants';
import { exactMatch } from './exact-matcher';
import { fuzzyMatch } from './fuzzy-matcher';
import { numericMatch } from './numeric-matcher';

function getAbvTolerance(beverageType: BeverageType): number {
  switch (beverageType) {
    case 'SPIRITS': return SPIRITS_ABV_TOLERANCE;
    case 'WINE': return WINE_ABV_TOLERANCE;
    case 'MALT_BEVERAGE': return MALT_ABV_TOLERANCE;
    default: return SPIRITS_ABV_TOLERANCE;
  }
}

export class AlgorithmicMatchingEngine implements MatchingEngine {
  compareFields(
    extracted: ParsedLabelFields,
    expected: ApplicationFields,
    beverageType: BeverageType
  ): FieldComparisonResult[] {
    const results: FieldComparisonResult[] = [];

    // Government Warning — exact match
    results.push(
      exactMatch('governmentWarning', expected.governmentWarning, extracted.governmentWarning)
    );

    // Alcohol Content — numeric match with tolerance
    if (expected.alcoholContent) {
      results.push(
        numericMatch(
          'alcoholContent',
          expected.alcoholContent,
          extracted.alcoholContent,
          getAbvTolerance(beverageType)
        )
      );
    }

    // Net Contents — numeric match
    results.push(
      numericMatch('netContents', expected.netContents, extracted.netContents, 0)
    );

    // Vintage Date — exact numeric
    if (expected.vintageDate) {
      if (!extracted.vintageDate) {
        results.push({
          fieldName: 'vintageDate',
          expected: expected.vintageDate,
          extracted: null,
          result: 'NOT_FOUND',
          confidence: 0,
          details: 'Vintage date not found on label',
        });
      } else if (extracted.vintageDate === expected.vintageDate) {
        results.push({
          fieldName: 'vintageDate',
          expected: expected.vintageDate,
          extracted: extracted.vintageDate,
          result: 'MATCH',
          confidence: 1.0,
        });
      } else {
        results.push({
          fieldName: 'vintageDate',
          expected: expected.vintageDate,
          extracted: extracted.vintageDate,
          result: 'MISMATCH',
          confidence: 0,
          details: `Expected vintage ${expected.vintageDate}, found ${extracted.vintageDate}`,
        });
      }
    }

    // Fuzzy match fields
    const fuzzyFields = [
      'brandName', 'classType', 'nameAddress', 'countryOfOrigin',
    ] as const;

    for (const fieldName of fuzzyFields) {
      const exp = expected[fieldName];
      if (!exp) continue; // Skip null/optional fields
      results.push(fuzzyMatch(fieldName, exp, extracted[fieldName]));
    }

    // Wine-only fuzzy fields
    if (beverageType === 'WINE') {
      for (const fieldName of WINE_ONLY_FIELDS) {
        if (fieldName === 'vintageDate') continue; // Already handled above
        const exp = expected[fieldName as keyof ApplicationFields] as string | null;
        if (!exp) continue;
        results.push(
          fuzzyMatch(fieldName, exp, extracted[fieldName as keyof ParsedLabelFields] as string | null)
        );
      }
    }

    return results;
  }
}
