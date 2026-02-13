export const GOVERNMENT_WARNING_TEXT =
  'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.';

export const GOVERNMENT_WARNING_PREFIX = 'GOVERNMENT WARNING';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'] as const;
export const ACCEPTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'] as const;
export const MAX_IMAGE_SIZE_BYTES = 4.5 * 1024 * 1024; // 4.5 MB (Vercel limit)

export const MAX_IMAGE_WIDTH = 1500; // Resize to this max width before OCR

export const PROCESSING_TIMEOUT_MS = 5000; // Hard requirement: < 5 seconds

// Fuzzy matching thresholds
export const MATCH_THRESHOLD = 0.95;
export const PARTIAL_THRESHOLD = 0.75;

// Numeric tolerances for alcohol content
export const SPIRITS_ABV_TOLERANCE = 0.3;
export const WINE_ABV_TOLERANCE = 1.5;
export const MALT_ABV_TOLERANCE = 0.3;

// Fields configuration per beverage type
export const UNIVERSAL_FIELDS = [
  'brandName',
  'classType',
  'alcoholContent',
  'netContents',
  'nameAddress',
  'governmentWarning',
  'countryOfOrigin',
] as const;

export const WINE_ONLY_FIELDS = [
  'appellation',
  'varietal',
  'vintageDate',
] as const;

export const ALL_FIELDS = [...UNIVERSAL_FIELDS, ...WINE_ONLY_FIELDS] as const;

export const FIELD_LABELS: Record<string, string> = {
  brandName: 'Brand Name',
  classType: 'Class/Type Designation',
  alcoholContent: 'Alcohol Content',
  netContents: 'Net Contents',
  nameAddress: 'Name & Address',
  governmentWarning: 'Government Warning',
  countryOfOrigin: 'Country of Origin',
  appellation: 'Appellation of Origin',
  varietal: 'Grape Varietal(s)',
  vintageDate: 'Vintage Date',
};

// Required fields by beverage type (null = optional)
export const REQUIRED_FIELDS: Record<string, string[]> = {
  SPIRITS: ['brandName', 'classType', 'alcoholContent', 'netContents', 'nameAddress', 'governmentWarning'],
  WINE: ['brandName', 'classType', 'netContents', 'nameAddress', 'governmentWarning'],
  MALT_BEVERAGE: ['brandName', 'classType', 'netContents', 'nameAddress', 'governmentWarning'],
};

export const CSV_COLUMNS = [
  'image_filename',
  'beverage_type',
  'brand_name',
  'class_type',
  'alcohol_content',
  'net_contents',
  'name_address',
  'government_warning',
  'country_of_origin',
  'appellation',
  'varietal',
  'vintage',
] as const;

export const BEVERAGE_TYPE_LABELS: Record<string, string> = {
  SPIRITS: 'Distilled Spirits',
  WINE: 'Wine',
  MALT_BEVERAGE: 'Malt Beverage',
};
