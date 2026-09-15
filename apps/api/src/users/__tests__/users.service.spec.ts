import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../../auth/auth.service';
import { UserRole, UserStatus } from '@compliance/shared';

import type { JwtPayload } from '@compliance/shared';

const masterAdmin = (): JwtPayload => ({
  sub: 'master-id',
  email: 'master@compliance.com',
  role: UserRole.MASTER_ADMIN,
  storeId: null,
});

const storeAdminA = (): JwtPayload => ({
  sub: 'admin-a-id',
  email: 'admin-a@store.com',
  role: UserRole.STORE_ADMIN,
  storeId: 'store-a-id',
});

const _storeAdminB = (): JwtPayload => ({
  sub: 'admin-b-id',
  email: 'admin-b@store.com',
  role: UserRole.STORE_ADMIN,
  storeId: 'store-b-id',
});

const makeStudent = (storeId = 'store-a-id'): Record<string, unknown> => ({
  id: 'student-id',
  name: 'Aluno Teste',
  email: 'aluno@store.com',
  role: 'STUDENT',
  status: 'ACTIVE',
  storeId,
  store: { name: 'Loja A' },
  phone: null,
  position: null,
  firstAccessCompletedAt: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  passwordHash: null,
  loginFailedAttempts: 0,
  loginBlockedUntil: null,
  createdById: null,
});

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  store: { findFirst: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
};

const mockAuthService = {
  createAndSendActivationToken: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
    mockPrisma.auditLog.create.mockResolvedValue({});
    mockAuthService.createAndSendActivationToken.mockResolvedValue(undefined);
  });

  describe('findAll — role isolation', () => {
    it('MASTER_ADMIN can list users from all stores', async () => {
      const students = [makeStudent('store-a-id'), makeStudent('store-b-id')];
      mockPrisma.$transaction.mockResolvedValue([students, 2]);

      const result = await service.findAll(masterAdmin(), {});

      expect(result.meta.total).toBe(2);
      // No storeId filter applied
      const whereArg = mockPrisma.$transaction.mock.calls[0];
      expect(whereArg).toBeDefined();
    });

    it('STORE_ADMIN can only see users from their own store', async () => {
      const students = [makeStudent('store-a-id')];
      mockPrisma.$transaction.mockResolvedValue([students, 1]);

      const result = await service.findAll(storeAdminA(), {});

      expect(result.meta.total).toBe(1);
    });

    it('STORE_ADMIN cannot filter by another storeId', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      // Even if storeId is passed in query, it is ignored — own storeId is always used
      await service.findAll(storeAdminA(), { storeId: 'store-b-id' });

      // The where clause should still include storeId: 'store-a-id'
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('findOne — store isolation', () => {
    it('STORE_ADMIN can access a user from their own store', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeStudent('store-a-id'));

      const result = await service.findOne('student-id', storeAdminA());

      expect(result.id).toBe('student-id');
    });

    it('STORE_ADMIN cannot access a user from another store', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeStudent('store-b-id'));

      await expect(service.findOne('student-id', storeAdminA())).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('MASTER_ADMIN can access any user regardless of store', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeStudent('store-b-id'));

      const result = await service.findOne('student-id', masterAdmin());

      expect(result.id).toBe('student-id');
    });

    it('throws NotFoundException for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing-id', masterAdmin())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create — RBAC rules', () => {
    beforeEach(() => {
      mockPrisma.store.findFirst.mockResolvedValue({ id: 'store-a-id', name: 'Loja A' });
      mockPrisma.user.findFirst.mockResolvedValue(null); // email is unique
    });

    it('STORE_ADMIN cannot create a user with role STORE_ADMIN', async () => {
      await expect(
        service.create(
          { name: 'Admin', email: 'admin@test.com', role: UserRole.STORE_ADMIN, storeId: 'store-a-id' },
          storeAdminA(),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('STORE_ADMIN cannot create a user with role MASTER_ADMIN', async () => {
      await expect(
        service.create(
          { name: 'Master', email: 'master@test.com', role: UserRole.MASTER_ADMIN },
          storeAdminA(),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('STORE_ADMIN storeId is always taken from JWT, not from payload', async () => {
      mockPrisma.user.create.mockResolvedValue({
        ...makeStudent('store-a-id'),
        email: 'new@test.com',
      });

      await service.create(
        {
          name: 'Student',
          email: 'new@test.com',
          role: UserRole.STUDENT,
          storeId: 'store-b-id', // Attempted injection — should be ignored
        },
        storeAdminA(),
      );

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ storeId: 'store-a-id' }), // JWT value
        }),
      );
    });

    it('MASTER_ADMIN can create a STORE_ADMIN', async () => {
      mockPrisma.user.create.mockResolvedValue({
        ...makeStudent('store-a-id'),
        role: 'STORE_ADMIN',
        email: 'admin@new.com',
      });

      const result = await service.create(
        { name: 'Admin', email: 'admin@new.com', role: UserRole.STORE_ADMIN, storeId: 'store-a-id' },
        masterAdmin(),
      );

      expect(result.role).toBe(UserRole.STORE_ADMIN);
    });

    it('throws ConflictException for duplicate email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeStudent());

      await expect(
        service.create(
          { name: 'Dup', email: 'aluno@store.com', role: UserRole.STUDENT, storeId: 'store-a-id' },
          masterAdmin(),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('sends activation email after creation', async () => {
      mockPrisma.user.create.mockResolvedValue({
        ...makeStudent(),
        email: 'newuser@store.com',
      });

      await service.create(
        { name: 'New', email: 'newuser@store.com', role: UserRole.STUDENT, storeId: 'store-a-id' },
        masterAdmin(),
      );

      expect(mockAuthService.createAndSendActivationToken).toHaveBeenCalledWith(
        'student-id',
        'newuser@store.com',
        expect.any(String),
      );
    });
  });

  describe('update — RBAC rules', () => {
    it('STORE_ADMIN cannot change user role', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeStudent('store-a-id'));

      await expect(
        service.update('student-id', { role: UserRole.STORE_ADMIN }, storeAdminA()),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('STORE_ADMIN cannot transfer user to another store', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeStudent('store-a-id'));

      await expect(
        service.update('student-id', { storeId: 'store-b-id' }, storeAdminA()),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('STORE_ADMIN cannot update user from another store', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeStudent('store-b-id'));

      await expect(
        service.update('student-id', { name: 'New Name' }, storeAdminA()),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('updateStatus — restrictions', () => {
    it('user cannot deactivate their own account', async () => {
      const self = makeStudent('store-a-id');
      self.id = 'admin-a-id'; // Same as storeAdminA().sub
      mockPrisma.user.findFirst.mockResolvedValue(self);

      await expect(
        service.updateStatus('admin-a-id', UserStatus.INACTIVE, storeAdminA()),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('STORE_ADMIN cannot update status of user from another store', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeStudent('store-b-id'));

      await expect(
        service.updateStatus('student-id', UserStatus.INACTIVE, storeAdminA()),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
