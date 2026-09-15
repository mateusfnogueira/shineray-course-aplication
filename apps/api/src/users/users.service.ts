import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { UserRole, UserStatus } from '@compliance/shared';
import type { JwtPayload, PaginatedResponse } from '@compliance/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { ListUsersQueryDto } from './dto/list-users-query.dto';
import type { UserResponseDto } from './dto/user-response.dto';
import type { ImportResultDto, ImportRowErrorDto } from './dto/import-result.dto';

type UserWithStore = User & { store?: { name: string } | null };

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll(
    requester: JwtPayload,
    query: ListUsersQueryDto,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const { page = 1, limit = 20, search, status, role } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      // STORE_ADMIN is always scoped to their own store
      ...(requester.role !== UserRole.MASTER_ADMIN
        ? { storeId: requester.storeId }
        : query.storeId
          ? { storeId: query.storeId }
          : {}),
      ...(status && { status }),
      ...(role && { role }),
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
        include: { store: { select: { name: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map((u) => this.toDto(u)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, requester: JwtPayload): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { store: { select: { name: true } } },
    });

    if (!user) throw new NotFoundException(`Usuário '${id}' não encontrado`);

    this.assertStoreScope(requester, user.storeId);
    return this.toDto(user);
  }

  async create(dto: CreateUserDto, requester: JwtPayload): Promise<UserResponseDto> {
    let effectiveStoreId = dto.storeId ?? null;

    if (requester.role === UserRole.STORE_ADMIN) {
      if (dto.role !== UserRole.STUDENT) {
        throw new ForbiddenException('STORE_ADMIN só pode criar usuários com perfil STUDENT');
      }
      // StoreId is ALWAYS taken from the JWT — never from the payload
      effectiveStoreId = requester.storeId;
    }

    if (dto.role !== UserRole.MASTER_ADMIN && !effectiveStoreId) {
      throw new BadRequestException('storeId é obrigatório para STORE_ADMIN e STUDENT');
    }

    if (effectiveStoreId) {
      const store = await this.prisma.store.findFirst({
        where: { id: effectiveStoreId, deletedAt: null, active: true },
      });
      if (!store) throw new NotFoundException(`Loja '${effectiveStoreId}' não encontrada ou inativa`);
    }

    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException(`E-mail '${dto.email}' já está em uso`);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        role: dto.role,
        status: UserStatus.INVITED,
        storeId: effectiveStoreId,
        phone: dto.phone ?? null,
        position: dto.position ?? null,
        createdById: requester.sub,
      },
      include: { store: { select: { name: true } } },
    });

    await this.authService.createAndSendActivationToken(user.id, user.email, user.name);

    await this.writeAuditLog(requester.sub, 'USER_CREATED', 'User', user.id, undefined, {
      email: user.email,
      role: user.role,
      storeId: user.storeId,
    });

    this.logger.log(`User created: ${user.email} (role: ${user.role}) by ${requester.sub}`);
    return this.toDto(user);
  }

  async update(id: string, dto: UpdateUserDto, requester: JwtPayload): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { store: { select: { name: true } } },
    });

    if (!user) throw new NotFoundException(`Usuário '${id}' não encontrado`);

    this.assertStoreScope(requester, user.storeId);

    if (requester.role === UserRole.STORE_ADMIN) {
      if (dto.role !== undefined) {
        throw new ForbiddenException('STORE_ADMIN não pode alterar o perfil do usuário');
      }
      if (dto.storeId !== undefined) {
        throw new ForbiddenException('STORE_ADMIN não pode transferir usuários entre lojas');
      }
    }

    const updateData: Prisma.UserUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.position !== undefined && { position: dto.position }),
      // Role and storeId only changeable by MASTER_ADMIN
      ...(requester.role === UserRole.MASTER_ADMIN && dto.role !== undefined && { role: dto.role }),
      ...(requester.role === UserRole.MASTER_ADMIN &&
        dto.storeId !== undefined && { storeId: dto.storeId }),
    };

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      include: { store: { select: { name: true } } },
    });

    await this.writeAuditLog(requester.sub, 'USER_UPDATED', 'User', id, {
      name: user.name,
      role: user.role,
      storeId: user.storeId,
    }, dto as Record<string, unknown>);

    return this.toDto(updated);
  }

  async updateStatus(
    id: string,
    status: UserStatus,
    requester: JwtPayload,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { store: { select: { name: true } } },
    });

    if (!user) throw new NotFoundException(`Usuário '${id}' não encontrado`);

    this.assertStoreScope(requester, user.storeId);

    if (id === requester.sub) {
      throw new BadRequestException('Não é possível alterar o status da própria conta');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
      include: { store: { select: { name: true } } },
    });

    await this.writeAuditLog(
      requester.sub,
      status === UserStatus.ACTIVE ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      'User',
      id,
      { status: user.status },
      { status },
    );

    return this.toDto(updated);
  }

  async resendInvite(id: string, requester: JwtPayload): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });

    if (!user) throw new NotFoundException(`Usuário '${id}' não encontrado`);

    this.assertStoreScope(requester, user.storeId);

    if (user.status !== UserStatus.INVITED) {
      throw new BadRequestException(
        'Convite só pode ser reenviado para usuários com status INVITED',
      );
    }

    await this.authService.createAndSendActivationToken(user.id, user.email, user.name);

    await this.writeAuditLog(requester.sub, 'INVITE_RESENT', 'User', id);
    this.logger.log(`Invite resent for user ${user.email} by ${requester.sub}`);
  }

  async importFromCsv(
    buffer: Buffer,
    requester: JwtPayload,
  ): Promise<ImportResultDto> {
    const MAX_ROWS = 500;
    const content = buffer.toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);

    if (lines.length < 2) throw new BadRequestException('Arquivo CSV vazio ou sem dados');
    if (lines.length - 1 > MAX_ROWS) {
      throw new BadRequestException(`Limite de ${MAX_ROWS} linhas por importação`);
    }

    const headers = this.parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
    const requiredCols = ['name', 'email', 'storecode'];
    const missing = requiredCols.filter((c) => !headers.includes(c));

    if (missing.length > 0) {
      throw new BadRequestException(`Colunas obrigatórias faltando: ${missing.join(', ')}`);
    }

    const nameIdx = headers.indexOf('name');
    const emailIdx = headers.indexOf('email');
    const storeCodeIdx = headers.indexOf('storecode');
    const positionIdx = headers.indexOf('position');
    const phoneIdx = headers.indexOf('phone');

    const result: ImportResultDto = { total: lines.length - 1, accepted: 0, rejected: 0, errors: [] };

    // Cache store lookups to avoid repeated DB queries
    const storeCache = new Map<string, string | null>();

    const resolveStoreId = async (code: string): Promise<string | null> => {
      if (storeCache.has(code)) return storeCache.get(code) ?? null;
      const store = await this.prisma.store.findFirst({
        where: { code, deletedAt: null, active: true },
        select: { id: true },
      });
      storeCache.set(code, store?.id ?? null);
      return store?.id ?? null;
    };

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVLine(lines[i] ?? '');
      const rowNum = i + 1;
      const errors: ImportRowErrorDto[] = [];

      const name = row[nameIdx]?.trim() ?? '';
      const email = row[emailIdx]?.trim().toLowerCase() ?? '';
      const storeCode = row[storeCodeIdx]?.trim().toUpperCase() ?? '';
      const position = positionIdx >= 0 ? (row[positionIdx]?.trim() || null) : null;
      const phone = phoneIdx >= 0 ? (row[phoneIdx]?.trim() || null) : null;

      if (!name || name.length < 2) {
        errors.push({ row: rowNum, field: 'name', message: 'Nome inválido ou muito curto' });
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ row: rowNum, field: 'email', message: `E-mail inválido: ${email}` });
      }
      if (!storeCode) {
        errors.push({ row: rowNum, field: 'storeCode', message: 'Código de loja ausente' });
      }

      if (errors.length > 0) {
        result.errors.push(...errors);
        result.rejected++;
        continue;
      }

      // For STORE_ADMIN: validate they can only import for their own store
      let targetStoreId: string | null = null;

      if (requester.role === UserRole.STORE_ADMIN) {
        const myStore = await this.prisma.store.findFirst({
          where: { id: requester.storeId!, deletedAt: null },
          select: { id: true, code: true },
        });
        if (!myStore || myStore.code !== storeCode) {
          result.errors.push({
            row: rowNum,
            field: 'storeCode',
            message: `STORE_ADMIN só pode importar para a própria loja (código: ${myStore?.code ?? 'N/A'})`,
          });
          result.rejected++;
          continue;
        }
        targetStoreId = myStore.id;
      } else {
        targetStoreId = await resolveStoreId(storeCode);
        if (!targetStoreId) {
          result.errors.push({
            row: rowNum,
            field: 'storeCode',
            message: `Loja com código '${storeCode}' não encontrada ou inativa`,
          });
          result.rejected++;
          continue;
        }
      }

      const existing = await this.prisma.user.findFirst({ where: { email } });
      if (existing) {
        result.errors.push({
          row: rowNum,
          field: 'email',
          message: `E-mail '${email}' já está cadastrado`,
        });
        result.rejected++;
        continue;
      }

      try {
        const user = await this.prisma.user.create({
          data: {
            name,
            email,
            role: UserRole.STUDENT,
            status: UserStatus.INVITED,
            storeId: targetStoreId,
            position,
            phone,
            createdById: requester.sub,
          },
        });

        await this.authService.createAndSendActivationToken(user.id, user.email, user.name);
        result.accepted++;
      } catch (err) {
        result.errors.push({ row: rowNum, field: 'general', message: 'Erro ao criar usuário' });
        result.rejected++;
        this.logger.error(`CSV import error at row ${rowNum}:`, err);
      }
    }

    await this.writeAuditLog(requester.sub, 'USERS_IMPORTED_CSV', 'User', undefined, undefined, {
      total: result.total,
      accepted: result.accepted,
      rejected: result.rejected,
    });

    this.logger.log(
      `CSV import by ${requester.sub}: ${result.accepted} accepted, ${result.rejected} rejected`,
    );

    return result;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Throws ForbiddenException if a non-MASTER_ADMIN tries to access a resource
   * that doesn't belong to their store.
   */
  private assertStoreScope(requester: JwtPayload, targetStoreId: string | null): void {
    if (requester.role === UserRole.MASTER_ADMIN) return;
    if (!requester.storeId || requester.storeId !== targetStoreId) {
      throw new ForbiddenException('Acesso não autorizado — usuário pertence a outra loja');
    }
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private toDto(user: UserWithStore): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      status: user.status as UserStatus,
      storeId: user.storeId,
      storeName: user.store?.name ?? null,
      phone: user.phone,
      position: user.position,
      firstAccessCompletedAt: user.firstAccessCompletedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async writeAuditLog(
    actorUserId: string,
    action: string,
    entityType: string,
    entityId?: string,
    previousData?: Record<string, unknown>,
    newData?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog
      .create({
        data: {
          actorUserId,
          action,
          entityType,
          entityId: entityId ?? null,
          previousData: previousData as Prisma.InputJsonValue | undefined,
          newData: newData as Prisma.InputJsonValue | undefined,
        },
      })
      .catch((err: unknown) => this.logger.error('Audit log failed', err));
  }
}
