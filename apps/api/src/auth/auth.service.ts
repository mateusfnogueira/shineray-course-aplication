import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { UserRole, UserStatus } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import type { UserProfileDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: UserProfileDto }> {
    const normalizedEmail = email.toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
    });

    // Prevent email enumeration — same error for missing user or wrong password
    if (!user || !user.passwordHash) {
      await this.recordAuditLog({
        action: 'LOGIN_FAILED',
        entityType: 'User',
        ipAddress,
        newData: { reason: 'user_not_found', email: normalizedEmail },
      });
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Check temporary block
    if (user.status === UserStatus.BLOCKED) {
      if (user.loginBlockedUntil && user.loginBlockedUntil > new Date()) {
        throw new UnauthorizedException(
          'Conta temporariamente bloqueada por excesso de tentativas. Tente novamente mais tarde.',
        );
      }
      // Block expired — reset atomically
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          status: UserStatus.ACTIVE,
          loginFailedAttempts: 0,
          loginBlockedUntil: null,
        },
      });
      user.status = UserStatus.ACTIVE;
      user.loginFailedAttempts = 0;
      user.loginBlockedUntil = null;
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('Conta inativa. Contate o administrador.');
    }

    if (user.status === UserStatus.INVITED) {
      throw new UnauthorizedException(
        'Conta ainda não ativada. Acesse o link de convite enviado por e-mail.',
      );
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);

    if (!passwordValid) {
      await this.handleFailedLogin(user, ipAddress);
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Reset failed attempts on success
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginFailedAttempts: 0,
        loginBlockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    await this.recordAuditLog({
      actorUserId: user.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      ipAddress,
    });

    const { accessToken, refreshToken } = await this.createSession(
      user,
      ipAddress,
      userAgent,
    );

    return { accessToken, refreshToken, user: this.toUserProfile(user) };
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  async refresh(rawRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const session = await this.prisma.session.findFirst({
      where: {
        refreshTokenHash: tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { select: { id: true, email: true, role: true, storeId: true, status: true, deletedAt: true } } },
    });

    if (!session || session.user.deletedAt || session.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    // Rotate: revoke old session, create new one
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const { accessToken, refreshToken } = await this.createSession(
      session.user as User,
      session.ipAddress ?? '',
      session.userAgent ?? '',
    );

    return { accessToken, refreshToken };
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.session.updateMany({
      where: { refreshTokenHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ─── Forgot password ─────────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null, status: UserStatus.ACTIVE },
    });

    // Always return success — prevents email enumeration
    if (!user) return;

    // Expire any existing unused tokens
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    });

    const { rawToken, tokenHash } = this.generateToken();
    const ttlHours = Number(this.config.get('RESET_PASSWORD_TOKEN_TTL_HOURS') ?? 2);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
      },
    });

    const appUrl = this.config.getOrThrow<string>('NEXT_PUBLIC_APP_URL');
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    await this.emailService.sendPasswordReset(user.email, user.name, resetUrl);

    await this.recordAuditLog({
      actorUserId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user.id,
    });
  }

  // ─── Reset password ──────────────────────────────────────────────────────────

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    if (resetToken.user.deletedAt || resetToken.user.status === UserStatus.INACTIVE) {
      throw new BadRequestException('Conta não está ativa');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      // Revoke all sessions (password changed — force re-login)
      this.prisma.session.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.recordAuditLog({
      actorUserId: resetToken.userId,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'User',
      entityId: resetToken.userId,
    });
  }

  // ─── Activate account ────────────────────────────────────────────────────────

  async activateAccount(
    token: string,
    password: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: UserProfileDto }> {
    const tokenHash = this.hashToken(token);

    const activationToken = await this.prisma.activationToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!activationToken) {
      throw new BadRequestException('Token de ativação inválido ou expirado');
    }

    if (activationToken.user.deletedAt) {
      throw new BadRequestException('Conta não encontrada');
    }

    if (activationToken.user.status !== UserStatus.INVITED) {
      throw new ConflictException('Conta já foi ativada anteriormente');
    }

    const passwordHash = await argon2.hash(password);

    const [, updatedUser] = await this.prisma.$transaction([
      this.prisma.activationToken.update({
        where: { id: activationToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: activationToken.userId },
        data: {
          passwordHash,
          status: UserStatus.ACTIVE,
          firstAccessCompletedAt: new Date(),
          lastLoginAt: new Date(),
        },
      }),
    ]);

    await this.recordAuditLog({
      actorUserId: activationToken.userId,
      action: 'ACCOUNT_ACTIVATED',
      entityType: 'User',
      entityId: activationToken.userId,
      ipAddress,
    });

    // Auto-login after activation
    const { accessToken, refreshToken } = await this.createSession(
      updatedUser,
      ipAddress,
      userAgent,
    );

    return { accessToken, refreshToken, user: this.toUserProfile(updatedUser) };
  }

  // ─── Change password ─────────────────────────────────────────────────────────

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, deletedAt: null },
    });

    if (!user.passwordHash) {
      throw new BadRequestException('Senha não configurada para esta conta');
    }

    const passwordValid = await argon2.verify(user.passwordHash, currentPassword);
    if (!passwordValid) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // Revoke all sessions (password changed)
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.emailService.sendPasswordChanged(user.email, user.name);

    await this.recordAuditLog({
      actorUserId: userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: userId,
    });
  }

  // ─── Get current user ────────────────────────────────────────────────────────

  async getMe(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, deletedAt: null },
    });
    return this.toUserProfile(user);
  }

  // ─── Legal documents ─────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/explicit-module-boundary-types
  async getPendingLegalDocuments(userId: string) {
    const activeDocuments = await this.prisma.legalDocument.findMany({
      where: { active: true },
      select: { id: true, type: true, title: true, version: true, content: true, publishedAt: true },
    });

    if (activeDocuments.length === 0) return [];

    const accepted = await this.prisma.legalAcceptance.findMany({
      where: {
        userId,
        legalDocumentId: { in: activeDocuments.map((d) => d.id) },
      },
      select: { legalDocumentId: true },
    });

    const acceptedIds = new Set(accepted.map((a) => a.legalDocumentId));
    return activeDocuments.filter((doc) => !acceptedIds.has(doc.id));
  }

  async acceptLegalDocument(
    userId: string,
    legalDocumentId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const document = await this.prisma.legalDocument.findFirst({
      where: { id: legalDocumentId, active: true },
    });

    if (!document) {
      throw new BadRequestException('Documento legal não encontrado ou não está mais ativo');
    }

    // Idempotent — ignore if already accepted
    await this.prisma.legalAcceptance.upsert({
      where: { userId_legalDocumentId: { userId, legalDocumentId } },
      create: { userId, legalDocumentId, ipAddress, userAgent },
      update: {},
    });
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async createSession(
    user: Pick<User, 'id' | 'email' | 'role' | 'storeId'>,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { rawToken, tokenHash } = this.generateToken();
    const refreshTtlDays = Number(this.config.get('JWT_REFRESH_EXPIRES_IN_DAYS') ?? 7);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: tokenHash,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + refreshTtlDays * 24 * 60 * 60 * 1000),
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      storeId: user.storeId,
    };

    const accessToken = this.jwtService.sign(payload);
    return { accessToken, refreshToken: rawToken };
  }

  private async handleFailedLogin(user: User, ipAddress: string): Promise<void> {
    const maxAttempts = Number(this.config.get('LOGIN_MAX_ATTEMPTS') ?? 5);
    const blockDurationMin = Number(this.config.get('LOGIN_BLOCK_DURATION_MINUTES') ?? 15);
    const newAttempts = user.loginFailedAttempts + 1;

    const updateData: Prisma.UserUpdateInput =
      newAttempts >= maxAttempts
        ? {
            loginFailedAttempts: newAttempts,
            status: UserStatus.BLOCKED,
            loginBlockedUntil: new Date(Date.now() + blockDurationMin * 60 * 1000),
          }
        : { loginFailedAttempts: newAttempts };

    await this.prisma.user.update({ where: { id: user.id }, data: updateData });

    await this.recordAuditLog({
      actorUserId: user.id,
      action: 'LOGIN_FAILED',
      entityType: 'User',
      entityId: user.id,
      ipAddress,
      newData: { attempt: newAttempts, blocked: newAttempts >= maxAttempts },
    });
  }

  private generateToken(): { rawToken: string; tokenHash: string } {
    const rawToken = randomBytes(64).toString('hex');
    return { rawToken, tokenHash: this.hashToken(rawToken) };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async recordAuditLog(data: {
    actorUserId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    ipAddress?: string;
    newData?: Record<string, unknown>;
  }): Promise<void> {
    const createData: Prisma.AuditLogUncheckedCreateInput = {
      actorUserId: data.actorUserId ?? null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId ?? null,
      ipAddress: data.ipAddress ?? null,
      newData: data.newData ? (data.newData as Prisma.InputJsonValue) : undefined,
    };
    await this.prisma.auditLog.create({ data: createData }).catch((err: unknown) => {
      this.logger.error('Failed to write audit log', err);
    });
  }

  private toUserProfile(user: User): UserProfileDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      status: user.status as UserStatus,
      storeId: user.storeId,
      phone: user.phone,
      position: user.position,
      firstAccessCompletedAt: user.firstAccessCompletedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  /** Used by UsersService (Phase 3) to create an activation token and send the invite email. */
  async createAndSendActivationToken(userId: string, userEmail: string, userName: string): Promise<void> {
    // Expire any existing unused tokens
    await this.prisma.activationToken.updateMany({
      where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date() },
    });

    const { rawToken, tokenHash } = this.generateToken();
    const ttlHours = Number(this.config.get('ACTIVATION_TOKEN_TTL_HOURS') ?? 48);

    await this.prisma.activationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
      },
    });

    const appUrl = this.config.getOrThrow<string>('NEXT_PUBLIC_APP_URL');
    const activationUrl = `${appUrl}/activate-account?token=${rawToken}`;

    await this.emailService.sendActivationEmail(userEmail, userName, activationUrl);

    this.logger.log(`Activation token created for user ${userId}`);
  }
}
