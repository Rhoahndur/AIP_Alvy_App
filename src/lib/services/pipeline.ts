import type { ApplicationFields, ParsedLabelFields } from '@/lib/types/matching';
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

/**
 * Reverse lookup: for fields the parser couldn't extract, check if the expected
 * value appears directly in the raw OCR text. This is more robust than heuristic
 * extraction because we already know what we're looking for.
 */
function reverseMatch(
  parsedFields: ParsedLabelFields,
  expected: ApplicationFields,
  rawText: string
): ParsedLabelFields {
  const normalizedRaw = rawText.toLowerCase().replace(/\s+/g, ' ');
  const patched = { ...parsedFields };

  const fieldsToCheck: (keyof ParsedLabelFields & keyof ApplicationFields)[] = [
    'brandName', 'classType', 'netContents', 'nameAddress',
    'countryOfOrigin', 'appellation', 'varietal', 'vintageDate',
  ];

  for (const field of fieldsToCheck) {
    // Only apply reverse lookup if the parser failed to extract
    if (patched[field]) continue;
    const expectedValue = expected[field];
    if (!expectedValue) continue;

    const normalizedExpected = expectedValue.toLowerCase().replace(/\s+/g, ' ');
    if (normalizedRaw.includes(normalizedExpected)) {
      // The expected value appears verbatim in the OCR text — use it
      patched[field] = expectedValue;
    }
  }

  return patched;
}

export async function verifyLabel(input: PipelineInput): Promise<PipelineResult> {
  const startTime = Date.now();

  // Step 1-3: Preprocess + OCR (handled inside the provider)
  const ocrResult = await ocrProvider.extractText(input.imageBuffer);

  // Step 4: Parse structured fields from raw OCR text
  const parsedFields = parseFieldsFromText(ocrResult.rawText);

  // Step 4b: Reverse lookup — for fields the parser missed, check if the
  // expected value appears anywhere in the raw OCR text
  const enrichedFields = reverseMatch(parsedFields, input.applicationData, ocrResult.rawText);

  // Step 5: Match extracted fields against application data
  const fieldResults = matchingEngine.compareFields(
    enrichedFields,
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
