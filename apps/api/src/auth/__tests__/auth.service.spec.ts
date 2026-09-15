import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { UserStatus } from '@compliance/shared';

import type { User } from '@prisma/client';

// Minimal User factory
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: null,
    role: 'STUDENT',
    status: 'ACTIVE',
    storeId: 'store-id',
    phone: null,
    position: null,
    firstAccessCompletedAt: null,
    lastLoginAt: null,
    loginFailedAttempts: 0,
    loginBlockedUntil: null,
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as User;
}

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findFirstOrThrow: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  activationToken: {
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  passwordResetToken: {
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
  legalDocument: { findMany: jest.fn() },
  legalAcceptance: { findMany: jest.fn(), upsert: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
};

const mockJwt = { sign: jest.fn(() => 'mock-access-token') };
const mockConfig = {
  getOrThrow: jest.fn((key: string) => {
    const values: Record<string, string> = {
      JWT_ACCESS_SECRET: 'test-secret',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    };
    return values[key] ?? '';
  }),
  get: jest.fn((key: string, fallback?: string) => fallback ?? ''),
};
const mockEmail = {
  sendActivationEmail: jest.fn(),
  sendPasswordReset: jest.fn(),
  sendPasswordChanged: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
    mockPrisma.auditLog.create.mockResolvedValue({});
    mockPrisma.session.create.mockResolvedValue({});
  });

  describe('login', () => {
    it('returns tokens and user profile on valid credentials', async () => {
      const hash = await argon2.hash('Password1');
      const user = makeUser({ passwordHash: hash });
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue(user);

      const result = await service.login('test@example.com', 'Password1', '127.0.0.1', 'test-agent');

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('throws UnauthorizedException on invalid password', async () => {
      const hash = await argon2.hash('CorrectPassword1');
      const user = makeUser({ passwordHash: hash });
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue(user);

      await expect(
        service.login('test@example.com', 'WrongPassword1', '127.0.0.1', 'ua'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when user does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login('nobody@example.com', 'Password1', '127.0.0.1', 'ua'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is INACTIVE', async () => {
      const user = makeUser({ status: UserStatus.INACTIVE, passwordHash: await argon2.hash('P') });
      mockPrisma.user.findFirst.mockResolvedValue(user);

      await expect(
        service.login('test@example.com', 'Password1', '127.0.0.1', 'ua'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is INVITED (not activated)', async () => {
      const user = makeUser({ status: UserStatus.INVITED });
      mockPrisma.user.findFirst.mockResolvedValue(user);

      await expect(
        service.login('test@example.com', 'Password1', '127.0.0.1', 'ua'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('blocks user after max consecutive failed attempts', async () => {
      const hash = await argon2.hash('CorrectPassword1');
      const user = makeUser({ passwordHash: hash, loginFailedAttempts: 4 });
      mockPrisma.user.findFirst.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({ ...user, loginFailedAttempts: 5, status: UserStatus.BLOCKED });

      await expect(
        service.login('test@example.com', 'WrongPassword1', '127.0.0.1', 'ua'),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: UserStatus.BLOCKED }),
        }),
      );
    });

    it('throws UnauthorizedException for blocked user within block period', async () => {
      const blockedUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 min from now
      const user = makeUser({ status: UserStatus.BLOCKED, loginBlockedUntil: blockedUntil, passwordHash: await argon2.hash('P') });
      mockPrisma.user.findFirst.mockResolvedValue(user);

      await expect(
        service.login('test@example.com', 'Password1', '127.0.0.1', 'ua'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('returns new tokens and revokes old session', async () => {
      const user = makeUser();
      mockPrisma.session.findFirst.mockResolvedValue({
        id: 'session-id',
        user,
        ipAddress: '127.0.0.1',
        userAgent: 'ua',
      });
      mockPrisma.session.update.mockResolvedValue({});

      const result = await service.refresh('valid-raw-token');

      expect(result.accessToken).toBe('mock-access-token');
      expect(mockPrisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ revokedAt: expect.any(Date) }) }),
      );
    });

    it('throws UnauthorizedException for revoked or expired session', async () => {
      mockPrisma.session.findFirst.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('activateAccount', () => {
    it('activates account and returns tokens', async () => {
      const user = makeUser({ status: UserStatus.INVITED });
      const activationRecord = {
        id: 'token-id',
        userId: user.id,
        user,
        expiresAt: new Date(Date.now() + 1000),
        usedAt: null,
      };
      mockPrisma.activationToken.findFirst.mockResolvedValue(activationRecord);
      mockPrisma.$transaction.mockResolvedValue([
        {},
        makeUser({ status: UserStatus.ACTIVE, firstAccessCompletedAt: new Date() }),
      ]);

      const result = await service.activateAccount(
        'valid-token',
        'NewPassword1',
        '127.0.0.1',
        'ua',
      );

      expect(result.accessToken).toBe('mock-access-token');
    });

    it('throws BadRequestException for invalid token', async () => {
      mockPrisma.activationToken.findFirst.mockResolvedValue(null);

      await expect(
        service.activateAccount('bad-token', 'Password1', '127.0.0.1', 'ua'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws ConflictException if account already activated', async () => {
      const user = makeUser({ status: UserStatus.ACTIVE });
      mockPrisma.activationToken.findFirst.mockResolvedValue({
        id: 'token-id',
        userId: user.id,
        user,
        expiresAt: new Date(Date.now() + 1000),
        usedAt: null,
      });

      await expect(
        service.activateAccount('token', 'Password1', '127.0.0.1', 'ua'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('resetPassword', () => {
    it('updates password and revokes all sessions', async () => {
      const user = makeUser();
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue({
        id: 'reset-id',
        userId: user.id,
        user,
        expiresAt: new Date(Date.now() + 1000),
        usedAt: null,
      });
      mockPrisma.$transaction.mockResolvedValue([{}, {}, {}]);

      await service.resetPassword('valid-token', 'NewPassword1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('throws BadRequestException for invalid/expired token', async () => {
      mockPrisma.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword('bad', 'Password1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
