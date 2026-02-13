export interface TextRegion {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface OCRResult {
  rawText: string;
  confidence: number;
  regions: TextRegion[];
}

export interface OCRProvider {
  extractText(imageBuffer: Buffer): Promise<OCRResult>;
  terminate?(): Promise<void>;
}
