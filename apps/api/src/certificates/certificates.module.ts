import { Module } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { PdfService } from './pdf.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [CertificatesController],
  providers: [CertificatesService, PdfService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
