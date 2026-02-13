import type { ApplicationRecord } from '@/lib/types/ingestion';
import type { BeverageType } from '@/lib/types/application';
import { GOVERNMENT_WARNING_TEXT, REQUIRED_FIELDS } from '@/lib/constants';

export function parseFormData(formData: FormData): ApplicationRecord {
  const beverageType = (formData.get('beverageType') as string)?.toUpperCase() as BeverageType;

  if (!['SPIRITS', 'WINE', 'MALT_BEVERAGE'].includes(beverageType)) {
    throw new Error(`Invalid beverage type: ${beverageType}`);
  }

  const record: ApplicationRecord = {
    imageFilename: (formData.get('imageFilename') as string) || '',
    beverageType,
    brandName: (formData.get('brandName') as string) || '',
    classType: (formData.get('classType') as string) || '',
    alcoholContent: (formData.get('alcoholContent') as string) || null,
    netContents: (formData.get('netContents') as string) || '',
    nameAddress: (formData.get('nameAddress') as string) || '',
    governmentWarning: GOVERNMENT_WARNING_TEXT,
    countryOfOrigin: (formData.get('countryOfOrigin') as string) || null,
    appellation: (formData.get('appellation') as string) || null,
    varietal: (formData.get('varietal') as string) || null,
    vintageDate: (formData.get('vintageDate') as string) || null,
  };

  // Validate required fields
  const required = REQUIRED_FIELDS[beverageType] || [];
  const missing = required.filter((f) => {
    const value = record[f as keyof ApplicationRecord];
    return !value || (typeof value === 'string' && !value.trim());
  });

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  if (!record.imageFilename) {
    throw new Error('Image filename is required');
  }

  return record;
}
