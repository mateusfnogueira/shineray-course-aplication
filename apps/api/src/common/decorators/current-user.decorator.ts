import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@compliance/shared';
import type { Request } from 'express';

/**
 * Extracts the authenticated user's JWT payload from the request.
 * Available on any route protected by JwtAuthGuard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { user: JwtPayload }>();
    return request.user;
  },
);
