import type { UserRole, UserStatus, LegalDocumentType } from '@compliance/shared';

export interface UserProfileDto {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly storeId: string | null;
  readonly phone: string | null;
  readonly position: string | null;
  readonly firstAccessCompletedAt: string | null;
  readonly lastLoginAt: string | null;
}

export interface AuthResponseDto {
  readonly accessToken: string;
  readonly user: UserProfileDto;
}

export interface PendingLegalDocumentDto {
  readonly id: string;
  readonly type: LegalDocumentType;
  readonly title: string;
  readonly version: string;
  readonly content: string;
  readonly publishedAt: string | null;
}
