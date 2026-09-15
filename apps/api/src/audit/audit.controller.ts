import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService, AuditQueryDto } from './audit.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@compliance/shared';

@ApiTags('audit')
@ApiBearerAuth('access-token')
@Roles(UserRole.MASTER_ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Paginated audit log (MASTER_ADMIN only)' })
  findAll(@Query() query: AuditQueryDto): ReturnType<AuditService['findAll']> {
    return this.auditService.findAll(query);
  }

  @Get('entity-types')
  @ApiOperation({ summary: 'List distinct entity types for filtering' })
  getEntityTypes(): ReturnType<AuditService['getDistinctEntityTypes']> {
    return this.auditService.getDistinctEntityTypes();
  }
}
