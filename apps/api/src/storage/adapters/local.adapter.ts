import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import type { StorageAdapterInterface } from '../interfaces/storage-adapter.interface';

/**
 * Local filesystem adapter for development.
 * Files are stored under the `uploads/` directory and served as static assets.
 */
@Injectable()
export class LocalStorageAdapter implements StorageAdapterInterface {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = this.config.get<string>('STORAGE_LOCAL_DIR', 'uploads');
    this.baseUrl = this.config.get<string>('NEXT_PUBLIC_API_URL', 'http://localhost:3001');
    mkdirSync(this.uploadDir, { recursive: true });
  }

  async upload(key: string, buffer: Buffer, _mimetype: string): Promise<string> {
    const filePath = join(this.uploadDir, key);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, buffer);
    this.logger.debug(`Stored file locally: ${key}`);
    return `${this.baseUrl}/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.uploadDir, key);
    try {
      unlinkSync(filePath);
    } catch {
      // Ignore missing file errors
    }
  }
}
