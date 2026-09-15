import { Injectable } from '@nestjs/common';
import { IsISO8601, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

export class AuditQueryDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) page?: number = 1;
  @ApiPropertyOptional({ default: 30 }) @IsOptional() @Type(() => Number) limit?: number = 30;
  @ApiPropertyOptional() @IsOptional() @IsString() action?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() entityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() startDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() endDate?: string;
}

export interface AuditLogDto {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  ipAddress: string | null;
  createdAt: Date;
  previousData: unknown;
  newData: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AuditQueryDto): Promise<{
    data: AuditLogDto[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const { page = 1, limit = 30, action, entityType, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(action && { action: { contains: action, mode: 'insensitive' as const } }),
      ...(entityType && { entityType }),
      ...((startDate ?? endDate) && {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { actorUser: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: data.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actorName: log.actorUser?.name ?? null,
        actorEmail: log.actorUser?.email ?? null,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
        previousData: log.previousData,
        newData: log.newData,
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getDistinctEntityTypes(): Promise<string[]> {
    const result = await this.prisma.auditLog.findMany({
      distinct: ['entityType'],
      select: { entityType: true },
      orderBy: { entityType: 'asc' },
    });
    return result.map((r) => r.entityType);
  }
}
