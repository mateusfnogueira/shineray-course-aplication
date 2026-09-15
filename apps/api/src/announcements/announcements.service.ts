import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { UserRole } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';
import { PrismaService } from '../prisma/prisma.service';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export class CreateAnnouncementDto {
  @ApiProperty() @IsString() @MinLength(3) title: string;
  @ApiProperty() @IsString() @MinLength(5) content: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() endsAt?: string;
  @ApiPropertyOptional({ type: [String], description: 'Empty = global (all stores)' })
  @IsOptional() @IsArray() @IsUUID('4', { each: true }) storeIds?: string[];
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateAnnouncementDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(3) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(5) content?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() startsAt?: string;
  @ApiPropertyOptional() @IsOptional() @IsISO8601() endsAt?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @IsUUID('4', { each: true }) storeIds?: string[];
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}

export class AnnouncementResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() content: string;
  @ApiProperty({ nullable: true }) bannerImageUrl: string | null;
  @ApiProperty({ nullable: true }) startsAt: Date | null;
  @ApiProperty({ nullable: true }) endsAt: Date | null;
  @ApiProperty() active: boolean;
  @ApiProperty({ type: [String] }) storeIds: string[];
  @ApiProperty() isGlobal: boolean;
  @ApiProperty() createdAt: Date;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(requester: JwtPayload): Promise<AnnouncementResponseDto[]> {
    const now = new Date();

    const where: Prisma.AnnouncementWhereInput =
      requester.role === UserRole.MASTER_ADMIN
        ? {}
        : {
            active: true,
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
            // For STORE_ADMIN and STUDENT: global OR in their store
            announcementStores: {
              some: { storeId: requester.storeId ?? '' },
            },
          };

    // Also include global announcements for non-MA
    const globalWhere: Prisma.AnnouncementWhereInput =
      requester.role !== UserRole.MASTER_ADMIN
        ? {
            active: true,
            announcementStores: { none: {} }, // no store associations = global
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
            AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
          }
        : {};

    const [storeAnnouncements, globalAnnouncements] =
      requester.role !== UserRole.MASTER_ADMIN
        ? await this.prisma.$transaction([
            this.prisma.announcement.findMany({
              where,
              include: { announcementStores: { select: { storeId: true } } },
              orderBy: { createdAt: 'desc' },
            }),
            this.prisma.announcement.findMany({
              where: globalWhere,
              include: { announcementStores: { select: { storeId: true } } },
              orderBy: { createdAt: 'desc' },
            }),
          ])
        : [
            await this.prisma.announcement.findMany({
              where,
              include: { announcementStores: { select: { storeId: true } } },
              orderBy: { createdAt: 'desc' },
            }),
            [],
          ];

    const seen = new Set<string>();
    return [...storeAnnouncements, ...globalAnnouncements]
      .filter((a) => { if (seen.has(a.id)) return false; seen.add(a.id); return true; })
      .map((a) => this.toDto(a));
  }

  async create(dto: CreateAnnouncementDto, actorId: string): Promise<AnnouncementResponseDto> {
    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        active: dto.active ?? true,
        createdById: actorId,
        announcementStores: dto.storeIds?.length
          ? { create: dto.storeIds.map((storeId) => ({ storeId })) }
          : undefined,
      },
      include: { announcementStores: { select: { storeId: true } } },
    });

    this.logger.log(`Announcement created: "${announcement.title}" by ${actorId}`);
    return this.toDto(announcement);
  }

  async update(id: string, dto: UpdateAnnouncementDto, _actorId: string): Promise<AnnouncementResponseDto> {
    const existing = await this.prisma.announcement.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Comunicado não encontrado');

    const announcement = await this.prisma.announcement.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.startsAt !== undefined && { startsAt: dto.startsAt ? new Date(dto.startsAt) : null }),
        ...(dto.endsAt !== undefined && { endsAt: dto.endsAt ? new Date(dto.endsAt) : null }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.storeIds !== undefined && {
          announcementStores: {
            deleteMany: {},
            create: dto.storeIds.map((storeId) => ({ storeId })),
          },
        }),
      },
      include: { announcementStores: { select: { storeId: true } } },
    });

    return this.toDto(announcement);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.announcement.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Comunicado não encontrado');
    await this.prisma.announcement.delete({ where: { id } });
  }

  private toDto(a: {
    id: string; title: string; content: string; bannerImageUrl: string | null;
    startsAt: Date | null; endsAt: Date | null; active: boolean; createdAt: Date;
    announcementStores: Array<{ storeId: string }>;
  }): AnnouncementResponseDto {
    const storeIds = a.announcementStores.map((s) => s.storeId);
    return {
      id: a.id,
      title: a.title,
      content: a.content,
      bannerImageUrl: a.bannerImageUrl,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      active: a.active,
      storeIds,
      isGlobal: storeIds.length === 0,
      createdAt: a.createdAt,
    };
  }
}
