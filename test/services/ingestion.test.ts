import { describe, it, expect } from 'vitest';
import { CSVIngestionProvider } from '@/lib/services/ingestion/csv-parser';
import { pairRecordsWithFiles } from '@/lib/services/ingestion/batch-pairer';
import { GOVERNMENT_WARNING_TEXT } from '@/lib/constants';
import fs from 'fs';
import path from 'path';

const csvProvider = new CSVIngestionProvider();

describe('CSVIngestionProvider', () => {
  it('parses the test fixtures CSV correctly', async () => {
    const csvPath = path.join(__dirname, '../fixtures/test-applications.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const result = await csvProvider.parseApplicationData(csvContent);

    expect(result.records.length).toBe(9);
    expect(result.errors.length).toBe(0);
  });

  it('parses all 3 beverage types', async () => {
    const csvPath = path.join(__dirname, '../fixtures/test-applications.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const result = await csvProvider.parseApplicationData(csvContent);

    const types = new Set(result.records.map((r) => r.beverageType));
    expect(types.has('SPIRITS')).toBe(true);
    expect(types.has('WINE')).toBe(true);
    expect(types.has('MALT_BEVERAGE')).toBe(true);
  });

  it('auto-populates government warning when empty', async () => {
    const csv = `image_filename,beverage_type,brand_name,class_type,alcohol_content,net_contents,name_address,government_warning,country_of_origin,appellation,varietal,vintage
test.png,SPIRITS,TestBrand,Whiskey,40%,750 mL,Test Address,,,,`;
    const result = await csvProvider.parseApplicationData(csv);

    expect(result.records.length).toBe(1);
    expect(result.records[0].governmentWarning).toBe(GOVERNMENT_WARNING_TEXT);
  });

  it('rejects CSV with missing required columns', async () => {
    const csv = `image_filename,beverage_type,brand_name
test.png,SPIRITS,TestBrand`;
    const result = await csvProvider.parseApplicationData(csv);

    expect(result.records.length).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('Missing required columns');
  });

  it('rejects invalid beverage type', async () => {
    const csv = `image_filename,beverage_type,brand_name,class_type,alcohol_content,net_contents,name_address,government_warning,country_of_origin,appellation,varietal,vintage
test.png,INVALID,TestBrand,Whiskey,40%,750 mL,Test Address,warning,,,,`;
    const result = await csvProvider.parseApplicationData(csv);

    expect(result.records.length).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].field).toBe('beverage_type');
  });

  it('rejects rows with missing required fields', async () => {
    const csv = `image_filename,beverage_type,brand_name,class_type,alcohol_content,net_contents,name_address,government_warning,country_of_origin,appellation,varietal,vintage
test.png,SPIRITS,,Whiskey,40%,750 mL,Test Address,warning,,,,`;
    const result = await csvProvider.parseApplicationData(csv);

    expect(result.records.length).toBe(0);
    expect(result.errors.some((e) => e.field === 'brand_name')).toBe(true);
  });

  it('handles quoted fields with commas', async () => {
    const csv = `image_filename,beverage_type,brand_name,class_type,alcohol_content,net_contents,name_address,government_warning,country_of_origin,appellation,varietal,vintage
test.png,SPIRITS,TestBrand,Whiskey,40%,750 mL,"123 Main St, Suite 100, City, ST 12345",warning,,,,`;
    const result = await csvProvider.parseApplicationData(csv);

    expect(result.records.length).toBe(1);
    expect(result.records[0].nameAddress).toContain('Suite 100');
  });

  it('handles BOM character', async () => {
    const csv = `\uFEFFimage_filename,beverage_type,brand_name,class_type,alcohol_content,net_contents,name_address,government_warning,country_of_origin,appellation,varietal,vintage
test.png,SPIRITS,TestBrand,Whiskey,40%,750 mL,Test Address,warning,,,,`;
    const result = await csvProvider.parseApplicationData(csv);

    expect(result.records.length).toBe(1);
  });

  it('returns empty for header-only CSV', async () => {
    const csv = `image_filename,beverage_type,brand_name,class_type,alcohol_content,net_contents,name_address,government_warning,country_of_origin,appellation,varietal,vintage`;
    const result = await csvProvider.parseApplicationData(csv);

    expect(result.records.length).toBe(0);
  });

  it('sets wine-only fields to null for non-wine records', async () => {
    const csv = `image_filename,beverage_type,brand_name,class_type,alcohol_content,net_contents,name_address,government_warning,country_of_origin,appellation,varietal,vintage
test.png,SPIRITS,TestBrand,Whiskey,40%,750 mL,Test Address,warning,,,,`;
    const result = await csvProvider.parseApplicationData(csv);

    expect(result.records[0].appellation).toBeNull();
    expect(result.records[0].varietal).toBeNull();
    expect(result.records[0].vintageDate).toBeNull();
  });
});

describe('pairRecordsWithFiles', () => {
  it('matches records to files by filename', () => {
    const records = [
      { imageFilename: 'test1.png', beverageType: 'SPIRITS' as const, brandName: 'A', classType: 'B', alcoholContent: null, netContents: '750 mL', nameAddress: 'addr', governmentWarning: 'warn', countryOfOrigin: null, appellation: null, varietal: null, vintageDate: null },
      { imageFilename: 'test2.png', beverageType: 'WINE' as const, brandName: 'C', classType: 'D', alcoholContent: null, netContents: '750 mL', nameAddress: 'addr', governmentWarning: 'warn', countryOfOrigin: null, appellation: null, varietal: null, vintageDate: null },
    ];
    const files = ['test1.png', 'test2.png'];

    const result = pairRecordsWithFiles(records, files);
    expect(result.matched.length).toBe(2);
    expect(result.unmatchedRecords.length).toBe(0);
    expect(result.unmatchedFiles.length).toBe(0);
  });

  it('matches case-insensitively', () => {
    const records = [
      { imageFilename: 'TEST.PNG', beverageType: 'SPIRITS' as const, brandName: 'A', classType: 'B', alcoholContent: null, netContents: '750 mL', nameAddress: 'addr', governmentWarning: 'warn', countryOfOrigin: null, appellation: null, varietal: null, vintageDate: null },
    ];
    const files = ['test.png'];

    const result = pairRecordsWithFiles(records, files);
    expect(result.matched.length).toBe(1);
  });

  it('reports unmatched records and files', () => {
    const records = [
      { imageFilename: 'test1.png', beverageType: 'SPIRITS' as const, brandName: 'A', classType: 'B', alcoholContent: null, netContents: '750 mL', nameAddress: 'addr', governmentWarning: 'warn', countryOfOrigin: null, appellation: null, varietal: null, vintageDate: null },
    ];
    const files = ['other.png'];

    const result = pairRecordsWithFiles(records, files);
    expect(result.matched.length).toBe(0);
    expect(result.unmatchedRecords.length).toBe(1);
    expect(result.unmatchedFiles).toContain('other.png');
  });
});
