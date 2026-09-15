import {
  Controller,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportQueryDto, ExportQueryDto } from './dto/report-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@Roles(UserRole.MASTER_ADMIN, UserRole.STORE_ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('courses')
  @ApiOperation({ summary: 'Course performance report (scoped by role)' })
  getCourseReport(
    @CurrentUser() requester: JwtPayload,
    @Query() query: ReportQueryDto,
  ): ReturnType<ReportsService['getCourseReport']> {
    return this.reportsService.getCourseReport(requester, query);
  }

  @Get('students')
  @ApiOperation({ summary: 'Student progress report (scoped by role)' })
  getStudentReport(
    @CurrentUser() requester: JwtPayload,
    @Query() query: ReportQueryDto,
  ): ReturnType<ReportsService['getStudentReport']> {
    return this.reportsService.getStudentReport(requester, query);
  }

  @Get('stores')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Store performance report (MASTER_ADMIN only)' })
  getStoreReport(
    @Query() query: ReportQueryDto,
  ): ReturnType<ReportsService['getStoreReport']> {
    return this.reportsService.getStoreReport(query);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Required courses pending completion (scoped by role)' })
  getPendingReport(
    @CurrentUser() requester: JwtPayload,
    @Query() query: ReportQueryDto,
  ): ReturnType<ReportsService['getPendingReport']> {
    return this.reportsService.getPendingReport(requester, query);
  }

  @Get('quiz-results')
  @ApiOperation({ summary: 'Quiz scores and attempt results (scoped by role)' })
  getQuizResultsReport(
    @CurrentUser() requester: JwtPayload,
    @Query() query: ReportQueryDto,
  ): ReturnType<ReportsService['getQuizResultsReport']> {
    return this.reportsService.getQuizResultsReport(requester, query);
  }

  @Get('certificates')
  @ApiOperation({ summary: 'Issued certificates report (scoped by role)' })
  getCertificatesReport(
    @CurrentUser() requester: JwtPayload,
    @Query() query: ReportQueryDto,
  ): ReturnType<ReportsService['getCertificatesReport']> {
    return this.reportsService.getCertificatesReport(requester, query);
  }

  @Get('export.csv')
  @ApiOperation({ summary: 'Export any report as CSV (BOM-prefixed for Excel)' })
  async exportCsv(
    @CurrentUser() requester: JwtPayload,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const type = query.type ?? 'courses';
    const csv = await this.reportsService.generateCsv(type, requester, query);
    const filename = `${type}-report-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8 compatibility
  }
}
