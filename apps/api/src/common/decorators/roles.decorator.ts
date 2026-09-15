import { SetMetadata } from '@nestjs/common';
import { type UserRole } from '@compliance/shared';

export const ROLES_KEY = 'roles';

/**
 * Restrict an endpoint to specific user roles.
 * Must be used with RolesGuard.
 */
export const Roles = (...roles: UserRole[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
