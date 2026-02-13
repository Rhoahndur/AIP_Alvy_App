export interface StorageProvider {
  uploadImage(file: Buffer, filename: string, contentType: string): Promise<string>;
  getImageUrl(filename: string): Promise<string>;
  deleteImage(url: string): Promise<void>;
}
