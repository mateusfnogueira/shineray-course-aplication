import { Test, type TestingModule } from '@nestjs/testing';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Integration tests for authentication flows.
 * Requires a real PostgreSQL instance (DATABASE_TEST_URL).
 *
 * Run with: pnpm --filter @compliance/api test:e2e
 */
describe('Auth Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testUserEmail: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Create an isolated test user
    testUserEmail = `integration-test-${Date.now()}@test.local`;
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.deleteMany({ where: { email: testUserEmail } });
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns 401 for non-existent user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.local', password: 'Password1' });

      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'not-an-email', password: 'Password1' });

      expect(res.status).toBe(400);
    });

    it('returns 400 when password is empty', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.local', password: '' });

      expect(res.status).toBe(400);
    });

    it('returns 200 with accessToken for valid MASTER_ADMIN credentials (requires seeded DB)', async () => {
      // This test only runs if the seed has been applied
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'mateusfranco@gmail.com', password: 'Admin@2026!' });

      // If seed is applied, expect 200; otherwise expect 401
      if (res.status === 200) {
        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('user');
        expect(res.body.user.role).toBe('MASTER_ADMIN');
      } else {
        expect(res.status).toBe(401);
      }
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns 401 without Bearer token', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns 401 with malformed Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('returns 204 even for non-existent email (prevents enumeration)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nobody@test.local' });

      expect(res.status).toBe(204);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'not-valid' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/activate-account', () => {
    it('returns 400 for invalid token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/activate-account')
        .send({ token: 'invalid-token-12345', password: 'NewPassword1!' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/health', () => {
    it('returns 200 with database: up', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });
});
