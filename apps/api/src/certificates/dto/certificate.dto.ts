import { ApiProperty } from '@nestjs/swagger';

export class CertificateResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() certificateCode: string;
  @ApiProperty() courseName: string;
  @ApiProperty() courseHours: number;
  @ApiProperty({ nullable: true }) storeName: string | null;
  @ApiProperty() studentName: string;
  @ApiProperty() issuedAt: Date;
  @ApiProperty({ nullable: true }) expiresAt: Date | null;
  @ApiProperty({ nullable: true }) revokedAt: Date | null;
  @ApiProperty({ nullable: true }) fileUrl: string | null;
  @ApiProperty({ enum: ['valid', 'expired', 'revoked'] }) status: 'valid' | 'expired' | 'revoked';
}

export class PublicCertificateDto {
  @ApiProperty() certificateCode: string;
  @ApiProperty() courseName: string;
  @ApiProperty({ description: 'Partial student name for privacy' }) studentDisplayName: string;
  @ApiProperty() issuedAt: Date;
  @ApiProperty({ nullable: true }) expiresAt: Date | null;
  @ApiProperty({ enum: ['valid', 'expired', 'revoked'] }) status: 'valid' | 'expired' | 'revoked';
}
