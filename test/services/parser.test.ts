import { describe, it, expect } from 'vitest';
import { parseFieldsFromText } from '@/lib/services/parser/field-parser';

describe('parseFieldsFromText', () => {
  const spiritsLabel = `OLD TOM DISTILLERY
Kentucky Straight Bourbon Whiskey
45% Alc./Vol. (90 Proof)
750 mL

GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.

Old Tom Distillery, 1234 Barrel Lane, Louisville, KY 40202`;

  it('extracts brand name', () => {
    const fields = parseFieldsFromText(spiritsLabel);
    expect(fields.brandName).toBeTruthy();
    expect(fields.brandName?.toUpperCase()).toContain('OLD TOM');
  });

  it('extracts class type from known values', () => {
    const fields = parseFieldsFromText(spiritsLabel);
    expect(fields.classType).toBeTruthy();
    expect(fields.classType?.toLowerCase()).toContain('bourbon');
  });

  it('extracts alcohol content with regex', () => {
    const fields = parseFieldsFromText(spiritsLabel);
    expect(fields.alcoholContent).toBeTruthy();
    expect(fields.alcoholContent).toContain('45');
    expect(fields.alcoholContent?.toLowerCase()).toContain('alc');
  });

  it('extracts net contents', () => {
    const fields = parseFieldsFromText(spiritsLabel);
    expect(fields.netContents).toBeTruthy();
    expect(fields.netContents).toContain('750');
  });

  it('extracts government warning', () => {
    const fields = parseFieldsFromText(spiritsLabel);
    expect(fields.governmentWarning).toBeTruthy();
    expect(fields.governmentWarning).toContain('GOVERNMENT WARNING');
    expect(fields.governmentWarning).toContain('Surgeon General');
  });

  it('extracts name and address with ZIP code', () => {
    const fields = parseFieldsFromText(spiritsLabel);
    expect(fields.nameAddress).toBeTruthy();
    expect(fields.nameAddress).toContain('40202');
  });

  it('extracts vintage year from wine label', () => {
    const wineLabel = `WILLAMETTE RESERVE
Pinot Noir
2021
Willamette Valley
13.5% Alc./Vol.
750 mL`;
    const fields = parseFieldsFromText(wineLabel);
    expect(fields.vintageDate).toBe('2021');
  });

  it('extracts appellation from known values', () => {
    const wineLabel = `WILLAMETTE RESERVE
Willamette Valley Pinot Noir
2021`;
    const fields = parseFieldsFromText(wineLabel);
    expect(fields.appellation).toBeTruthy();
    expect(fields.appellation?.toLowerCase()).toContain('willamette');
  });

  it('extracts varietal from known values', () => {
    const wineLabel = `Some Winery
Pinot Noir
2021`;
    const fields = parseFieldsFromText(wineLabel);
    expect(fields.varietal).toBeTruthy();
    expect(fields.varietal?.toLowerCase()).toContain('pinot noir');
  });

  it('extracts country of origin', () => {
    const label = `Some Brand
Product of France
750 mL`;
    const fields = parseFieldsFromText(label);
    expect(fields.countryOfOrigin).toBeTruthy();
    expect(fields.countryOfOrigin?.toLowerCase()).toContain('france');
  });

  it('handles FL OZ in net contents', () => {
    const label = `IPA Beer
12 FL OZ
6.8% Alc./Vol.`;
    const fields = parseFieldsFromText(label);
    expect(fields.netContents).toBeTruthy();
    expect(fields.netContents).toContain('12');
  });

  it('returns null for fields not present in text', () => {
    const minimalLabel = `Some text with no structured data`;
    const fields = parseFieldsFromText(minimalLabel);
    expect(fields.alcoholContent).toBeNull();
    expect(fields.netContents).toBeNull();
    expect(fields.governmentWarning).toBeNull();
    expect(fields.vintageDate).toBeNull();
  });
});
