import type { ApplicationRecord, PairingResult } from '@/lib/types/ingestion';

export function pairRecordsWithFiles(
  records: ApplicationRecord[],
  fileNames: string[]
): PairingResult {
  const fileMap = new Map<string, string>();
  for (const name of fileNames) {
    fileMap.set(name.toLowerCase(), name);
  }

  const matched: PairingResult['matched'] = [];
  const unmatchedRecords: PairingResult['unmatchedRecords'] = [];
  const matchedFileNames = new Set<string>();

  records.forEach((record, idx) => {
    const lookupKey = record.imageFilename.toLowerCase();
    const actualFileName = fileMap.get(lookupKey);

    if (actualFileName) {
      matched.push({
        record,
        file: null as unknown as File,
        filename: actualFileName,
      });
      matchedFileNames.add(lookupKey);
    } else {
      unmatchedRecords.push({ record, row: idx + 2 }); // +2 for header row + 0-index
    }
  });

  const unmatchedFiles = fileNames.filter(
    (name) => !matchedFileNames.has(name.toLowerCase())
  );

  return { matched, unmatchedRecords, unmatchedFiles };
}
