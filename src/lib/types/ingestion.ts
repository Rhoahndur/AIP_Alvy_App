import type { BeverageType } from './application';

export interface ApplicationRecord {
  imageFilename: string;
  beverageType: BeverageType;
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

export interface ValidationError {
  row?: number;
  field: string;
  message: string;
}

export interface ParseResult {
  records: ApplicationRecord[];
  errors: ValidationError[];
}

export interface PairingResult {
  matched: Array<{
    record: ApplicationRecord;
    file: File | Buffer;
    filename: string;
  }>;
  unmatchedRecords: Array<{ record: ApplicationRecord; row: number }>;
  unmatchedFiles: string[];
}

export interface IngestionProvider {
  parseApplicationData(input: File | Buffer | string): Promise<ParseResult>;
}
