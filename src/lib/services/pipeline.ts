import type { ApplicationFields } from '@/lib/types/matching';
import type { FieldComparisonResult } from '@/lib/types/matching';
import type { BeverageType } from '@/lib/types/application';
import ocrProvider from './ocr';
import { parseFieldsFromText } from './parser';
import matchingEngine from './matching';

export interface PipelineInput {
  imageBuffer: Buffer;
  applicationData: ApplicationFields;
  beverageType: BeverageType;
}

export interface PipelineResult {
  ocrRawText: string;
  ocrConfidence: number;
  fieldResults: FieldComparisonResult[];
  overallResult: 'AUTO_PASS' | 'AUTO_FAIL';
  processingTimeMs: number;
}

export async function verifyLabel(input: PipelineInput): Promise<PipelineResult> {
  const startTime = Date.now();

  // Step 1-3: Preprocess + OCR (handled inside the provider)
  const ocrResult = await ocrProvider.extractText(input.imageBuffer);

  // Step 4: Parse structured fields from raw OCR text
  const parsedFields = parseFieldsFromText(ocrResult.rawText);

  // Step 5: Match extracted fields against application data
  const fieldResults = matchingEngine.compareFields(
    parsedFields,
    input.applicationData,
    input.beverageType
  );

  // Determine overall result
  const hasFailure = fieldResults.some(
    (r) => r.result === 'MISMATCH' || r.result === 'NOT_FOUND'
  );
  const overallResult = hasFailure ? 'AUTO_FAIL' : 'AUTO_PASS';

  const processingTimeMs = Date.now() - startTime;

  return {
    ocrRawText: ocrResult.rawText,
    ocrConfidence: ocrResult.confidence,
    fieldResults,
    overallResult,
    processingTimeMs,
  };
}
