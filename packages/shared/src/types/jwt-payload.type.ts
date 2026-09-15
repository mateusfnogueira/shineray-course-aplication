import type { UserRole } from '../enums/user-role.enum';

export interface JwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly role: UserRole;
  readonly storeId: string | null;
  readonly iat?: number;
  readonly exp?: number;
}
