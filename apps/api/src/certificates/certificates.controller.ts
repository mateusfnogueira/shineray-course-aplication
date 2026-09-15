import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CertificatesService } from './certificates.service';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';

@ApiTags('certificates')
@Controller()
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  // ─── Public validation (no auth required) ─────────────────────────────────

  @Public()
  @Get('certificate/validate/:code')
  @ApiOperation({ summary: 'Public certificate validation — returns minimal info, no PII' })
  validate(
    @Param('code') code: string,
  ): ReturnType<CertificatesService['validateByCode']> {
    return this.certificatesService.validateByCode(code);
  }

  // ─── Admin endpoints ──────────────────────────────────────────────────────

  @ApiBearerAuth('access-token')
  @Roles(UserRole.MASTER_ADMIN)
  @Post('enrollments/:enrollmentId/certificate/reissue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reissue certificate for a completed enrollment (MASTER_ADMIN)' })
  reissue(
    @Param('enrollmentId', ParseUUIDPipe) enrollmentId: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<CertificatesService['reissue']> {
    return this.certificatesService.reissue(enrollmentId, user.sub);
  }

  @ApiBearerAuth('access-token')
  @Roles(UserRole.MASTER_ADMIN)
  @Patch('certificates/:id/revoke')
  @ApiOperation({ summary: 'Revoke a certificate (MASTER_ADMIN)' })
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<CertificatesService['revoke']> {
    return this.certificatesService.revoke(id, user.sub);
  }

  @ApiBearerAuth('access-token')
  @Roles(UserRole.MASTER_ADMIN, UserRole.STORE_ADMIN)
  @Get('users/:userId/certificates')
  @ApiOperation({ summary: 'List certificates for a user (admin)' })
  listForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): ReturnType<CertificatesService['listByEnrollmentOrUser']> {
    return this.certificatesService.listByEnrollmentOrUser({ userId });
  }
}
