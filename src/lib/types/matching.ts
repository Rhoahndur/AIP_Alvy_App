import type { BeverageType } from './application';

export type MatchResultType = 'MATCH' | 'MISMATCH' | 'PARTIAL' | 'NOT_FOUND';

export interface FieldComparisonResult {
  fieldName: string;
  expected: string;
  extracted: string | null;
  result: MatchResultType;
  confidence: number;
  details?: string;
}

export interface MatchingEngine {
  compareFields(
    extracted: ParsedLabelFields,
    expected: ApplicationFields,
    beverageType: BeverageType
  ): FieldComparisonResult[];
}

export interface ParsedLabelFields {
  brandName: string | null;
  classType: string | null;
  alcoholContent: string | null;
  netContents: string | null;
  nameAddress: string | null;
  governmentWarning: string | null;
  countryOfOrigin: string | null;
  appellation: string | null;
  varietal: string | null;
  vintageDate: string | null;
}

export interface ApplicationFields {
  brandName: string;
  classType: string;
  alcoholContent: string | null;
  netContents: string;
  nameAddress: string;
  governmentWarning: string;
  countryOfOrigin: string | null;
  appellation: string | null;
  varietal: string | null;
  vintageDate: string | null;
}
