import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Store } from '@prisma/client';
import type { PaginatedResponse } from '@compliance/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateStoreDto } from './dto/create-store.dto';
import type { UpdateStoreDto } from './dto/update-store.dto';
import type { ListStoresQueryDto } from './dto/list-stores-query.dto';
import type { StoreResponseDto } from './dto/store-response.dto';

@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListStoresQueryDto): Promise<PaginatedResponse<StoreResponseDto>> {
    const { page = 1, limit = 20, search, active } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StoreWhereInput = {
      deletedAt: null,
      ...(active !== undefined && { active }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.store.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.store.count({ where }),
    ]);

    return {
      data: data.map((s) => this.toDto(s)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string): Promise<StoreResponseDto> {
    return this.toDto(await this.findOrThrow(id));
  }

  async create(dto: CreateStoreDto, actorUserId: string): Promise<StoreResponseDto> {
    const existing = await this.prisma.store.findFirst({
      where: { code: dto.code, deletedAt: null },
    });
    if (existing) throw new ConflictException(`Código de loja '${dto.code}' já está em uso`);

    const store = await this.prisma.store.create({ data: dto });

    await this.writeAuditLog(actorUserId, 'STORE_CREATED', 'Store', store.id, undefined, {
      name: store.name,
      code: store.code,
    });

    this.logger.log(`Store created: ${store.code} by ${actorUserId}`);
    return this.toDto(store);
  }

  async update(id: string, dto: UpdateStoreDto, actorUserId: string): Promise<StoreResponseDto> {
    const store = await this.findOrThrow(id);

    if (dto.code && dto.code !== store.code) {
      const existing = await this.prisma.store.findFirst({
        where: { code: dto.code, id: { not: id }, deletedAt: null },
      });
      if (existing) throw new ConflictException(`Código '${dto.code}' já está em uso por outra loja`);
    }

    const updated = await this.prisma.store.update({ where: { id }, data: dto });

    await this.writeAuditLog(actorUserId, 'STORE_UPDATED', 'Store', id, {
      name: store.name,
      code: store.code,
      active: store.active,
    }, dto as Record<string, unknown>);

    return this.toDto(updated);
  }

  async updateStatus(id: string, active: boolean, actorUserId: string): Promise<StoreResponseDto> {
    await this.findOrThrow(id);
    const updated = await this.prisma.store.update({ where: { id }, data: { active } });

    await this.writeAuditLog(
      actorUserId,
      active ? 'STORE_ACTIVATED' : 'STORE_DEACTIVATED',
      'Store',
      id,
      undefined,
      { active },
    );

    return this.toDto(updated);
  }

  async findStoreUsers(
    storeId: string,
    query: ListStoresQueryDto,
  ): Promise<PaginatedResponse<{
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    position: string | null;
    lastLoginAt: Date | null;
  }>> {
    await this.findOrThrow(storeId);
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      storeId,
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          position: true,
          lastLoginAt: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findStoreMetrics(storeId: string): Promise<{
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalEnrollments: number;
    completedEnrollments: number;
    completionRate: number;
  }> {
    await this.findOrThrow(storeId);

    const [totalUsers, activeUsers, totalEnrollments, completedEnrollments] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: { storeId, deletedAt: null } }),
        this.prisma.user.count({ where: { storeId, status: 'ACTIVE', deletedAt: null } }),
        this.prisma.enrollment.count({ where: { user: { storeId } } }),
        this.prisma.enrollment.count({ where: { user: { storeId }, status: 'COMPLETED' } }),
      ]);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      totalEnrollments,
      completedEnrollments,
      completionRate:
        totalEnrollments > 0
          ? Math.round((completedEnrollments / totalEnrollments) * 100)
          : 0,
    };
  }

  private async findOrThrow(id: string): Promise<Store> {
    const store = await this.prisma.store.findFirst({ where: { id, deletedAt: null } });
    if (!store) throw new NotFoundException(`Loja com ID '${id}' não encontrada`);
    return store;
  }

  private toDto(store: Store): StoreResponseDto {
    return {
      id: store.id,
      name: store.name,
      code: store.code,
      document: store.document,
      region: store.region,
      city: store.city,
      state: store.state,
      active: store.active,
      createdAt: store.createdAt,
      updatedAt: store.updatedAt,
    };
  }

  private async writeAuditLog(
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    previousData?: Record<string, unknown>,
    newData?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog
      .create({
        data: {
          actorUserId,
          action,
          entityType,
          entityId,
          previousData: previousData as Prisma.InputJsonValue | undefined,
          newData: newData as Prisma.InputJsonValue | undefined,
        },
      })
      .catch((err: unknown) => this.logger.error('Audit log failed', err));
  }
}
