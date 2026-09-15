import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@compliance/shared';
import { LegalDocumentType } from '@prisma/client';

export class UserProfileDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty({ enum: UserStatus }) status: UserStatus;
  @ApiProperty({ nullable: true }) storeId: string | null;
  @ApiProperty({ nullable: true }) phone: string | null;
  @ApiProperty({ nullable: true }) position: string | null;
  @ApiProperty({ nullable: true }) firstAccessCompletedAt: Date | null;
  @ApiProperty({ nullable: true }) lastLoginAt: Date | null;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token (15 min)' })
  accessToken: string;

  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;
}

export class RefreshResponseDto {
  @ApiProperty({ description: 'New JWT access token (15 min)' })
  accessToken: string;
}

export class PendingLegalDocumentDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: LegalDocumentType }) type: LegalDocumentType;
  @ApiProperty() title: string;
  @ApiProperty() version: string;
  @ApiProperty() content: string;
  @ApiProperty({ nullable: true }) publishedAt: Date | null;
}
