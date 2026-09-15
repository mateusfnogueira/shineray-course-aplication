import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { extname } from 'path';
import type { StorageAdapterInterface } from './interfaces/storage-adapter.interface';
import { STORAGE_ADAPTER } from './storage.constants';

const ALLOWED_MIMETYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(STORAGE_ADAPTER) private readonly adapter: StorageAdapterInterface,
  ) {}

  /**
   * Upload a file and return the public URL.
   * @param folder  Logical folder name (e.g. 'course-covers', 'lesson-materials')
   * @param buffer  File content
   * @param originalName  Original filename (used to infer extension)
   * @param mimetype  MIME type for validation
   */
  async upload(
    folder: string,
    buffer: Buffer,
    originalName: string,
    mimetype: string,
  ): Promise<string> {
    if (!ALLOWED_MIMETYPES[mimetype]) {
      throw new Error(
        `Tipo de arquivo não permitido: ${mimetype}. Tipos aceitos: ${Object.keys(ALLOWED_MIMETYPES).join(', ')}`,
      );
    }

    const ext = ALLOWED_MIMETYPES[mimetype] ?? extname(originalName);
    const key = `${folder}/${randomBytes(16).toString('hex')}${ext}`;

    const url = await this.adapter.upload(key, buffer, mimetype);
    this.logger.log(`Uploaded: ${key}`);
    return url;
  }

  async delete(url: string): Promise<void> {
    // Extract key from URL (last part of the path after /uploads/)
    const uploadsIdx = url.indexOf('/uploads/');
    if (uploadsIdx === -1) return;
    const key = url.slice(uploadsIdx + '/uploads/'.length);
    await this.adapter.delete(key);
  }
}
