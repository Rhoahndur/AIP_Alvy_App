export type BeverageType = 'SPIRITS' | 'WINE' | 'MALT_BEVERAGE';
export type Status = 'PENDING' | 'VERIFIED' | 'MANUALLY_REVIEWED';
export type OverallResult = 'AUTO_PASS' | 'AUTO_FAIL' | 'MANUAL_PASS' | 'MANUAL_FAIL';

export interface ApplicationSummary {
  id: string;
  createdAt: string;
  status: Status;
  beverageType: BeverageType;
  brandName: string;
  classType: string;
  imageFilename: string;
  batchId: string | null;
}

export interface ApplicationDetail {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: Status;
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
  imageUrl: string;
  imageFilename: string;
  batchId: string | null;
  verificationResult: VerificationResultDetail | null;
}

export interface VerificationResultDetail {
  id: string;
  createdAt: string;
  overallResult: OverallResult;
  processingTimeMs: number;
  ocrRawText: string;
  ocrConfidence: number;
  fieldResults: FieldResultDetail[];
  agentNotes: string | null;
  reviewedAt: string | null;
}

export interface FieldResultDetail {
  id: string;
  fieldName: string;
  expectedValue: string;
  extractedValue: string | null;
  autoResult: 'MATCH' | 'MISMATCH' | 'PARTIAL' | 'NOT_FOUND';
  confidence: number;
  agentOverride: 'MATCH' | 'MISMATCH' | 'PARTIAL' | 'NOT_FOUND' | null;
  overrideReason: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
