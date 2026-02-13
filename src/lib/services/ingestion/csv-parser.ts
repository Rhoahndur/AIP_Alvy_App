import type { IngestionProvider, ApplicationRecord, ParseResult, ValidationError } from '@/lib/types/ingestion';
import type { BeverageType } from '@/lib/types/application';
import { GOVERNMENT_WARNING_TEXT, REQUIRED_FIELDS, CSV_COLUMNS } from '@/lib/constants';

const VALID_BEVERAGE_TYPES = ['SPIRITS', 'WINE', 'MALT_BEVERAGE'];

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

export class CSVIngestionProvider implements IngestionProvider {
  async parseApplicationData(input: File | Buffer | string): Promise<ParseResult> {
    let content: string;
    if (typeof input === 'string') {
      content = input;
    } else if (Buffer.isBuffer(input)) {
      content = input.toString('utf-8');
    } else {
      content = await input.text();
    }

    // Strip BOM
    content = content.replace(/^\uFEFF/, '');

    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return { records: [], errors: [{ field: 'csv', message: 'CSV must have a header row and at least one data row' }] };
    }

    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));

    // Validate required columns
    const missingCols = CSV_COLUMNS.filter((col) => !headers.includes(col));
    if (missingCols.length > 0) {
      return { records: [], errors: [{ field: 'csv', message: `Missing required columns: ${missingCols.join(', ')}` }] };
    }

    const records: ApplicationRecord[] = [];
    const errors: ValidationError[] = [];

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = fields[idx] || ''; });

      const rowNum = i + 1;

      // Validate beverage type
      const beverageType = row['beverage_type']?.toUpperCase();
      if (!VALID_BEVERAGE_TYPES.includes(beverageType)) {
        errors.push({ row: rowNum, field: 'beverage_type', message: `Invalid beverage type: "${row['beverage_type']}"` });
        continue;
      }

      // Validate required fields
      const required = REQUIRED_FIELDS[beverageType] || [];
      const fieldMap: Record<string, string> = {
        brandName: 'brand_name',
        classType: 'class_type',
        alcoholContent: 'alcohol_content',
        netContents: 'net_contents',
        nameAddress: 'name_address',
        governmentWarning: 'government_warning',
      };

      let hasErrors = false;
      for (const req of required) {
        const csvCol = fieldMap[req];
        if (csvCol && !row[csvCol]?.trim()) {
          errors.push({ row: rowNum, field: csvCol, message: `Required field "${csvCol}" is empty` });
          hasErrors = true;
        }
      }

      if (!row['image_filename']?.trim()) {
        errors.push({ row: rowNum, field: 'image_filename', message: 'image_filename is required' });
        hasErrors = true;
      }

      if (hasErrors) continue;

      const govWarning = row['government_warning']?.trim() || GOVERNMENT_WARNING_TEXT;

      records.push({
        imageFilename: row['image_filename'].trim(),
        beverageType: beverageType as BeverageType,
        brandName: row['brand_name'].trim(),
        classType: row['class_type'].trim(),
        alcoholContent: row['alcohol_content']?.trim() || null,
        netContents: row['net_contents'].trim(),
        nameAddress: row['name_address'].trim(),
        governmentWarning: govWarning,
        countryOfOrigin: row['country_of_origin']?.trim() || null,
        appellation: row['appellation']?.trim() || null,
        varietal: row['varietal']?.trim() || null,
        vintageDate: row['vintage']?.trim() || null,
      });
    }

    return { records, errors };
  }
}
