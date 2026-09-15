export interface StorageAdapterInterface {
  upload(key: string, buffer: Buffer, mimetype: string): Promise<string>;
  delete(key: string): Promise<void>;
}
