import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { Request } from 'express';

/**
 * Authorization guard that checks the user role against @Roles() metadata.
 * Must run after JwtAuthGuard (which populates request.user).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;

    if (!user) throw new ForbiddenException('Acesso não autorizado');

    if (!requiredRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException(
        `Permissão insuficiente. Perfil necessário: ${requiredRoles.join(' ou ')}`,
      );
    }

    return true;
  }
}
