import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';

class StoreDashboardQueryDto {
  @IsOptional() @IsUUID('4') storeId?: string;
}

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('master')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Global metrics dashboard (MASTER_ADMIN only)' })
  getMasterDashboard(): ReturnType<DashboardService['getMasterDashboard']> {
    return this.dashboardService.getMasterDashboard();
  }

  @Get('store')
  @Roles(UserRole.MASTER_ADMIN, UserRole.STORE_ADMIN)
  @ApiOperation({ summary: 'Store metrics dashboard (STORE_ADMIN: own store; MA: pass storeId)' })
  getStoreDashboard(
    @CurrentUser() user: JwtPayload,
    @Query() query: StoreDashboardQueryDto,
  ): ReturnType<DashboardService['getStoreDashboard']> {
    const storeId = user.role === UserRole.MASTER_ADMIN ? query.storeId! : user.storeId!;
    return this.dashboardService.getStoreDashboard(storeId);
  }
}
