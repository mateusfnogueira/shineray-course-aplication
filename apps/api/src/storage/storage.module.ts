import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';
import { LocalStorageAdapter } from './adapters/local.adapter';
import { STORAGE_ADAPTER } from './storage.constants';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_ADAPTER,
      useFactory: (config: ConfigService) => new LocalStorageAdapter(config),
      inject: [ConfigService],
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
