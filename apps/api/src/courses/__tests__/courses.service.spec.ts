import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CoursesService } from '../courses.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, CourseStatus } from '@compliance/shared';
import type { JwtPayload, LessonType } from '@compliance/shared';

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

const draftCourse = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'course-id',
  title: 'Curso Teste',
  slug: 'curso-teste',
  shortDescription: 'Descrição curta',
  description: 'Descrição completa do curso',
  coverImageUrl: null,
  estimatedDurationMinutes: 60,
  minimumPassingScore: null,
  maximumAttempts: null,
  status: 'DRAFT' as const,
  certificateEnabled: false,
  publishedAt: null,
  createdById: 'master-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  _count: { modules: 0 },
  modules: [],
  ...overrides,
});

const mockPrisma = {
  course: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  courseModule: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  lesson: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  courseStoreAccess: {
    findMany: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
};

describe('CoursesService', () => {
  let service: CoursesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(CoursesService);
    jest.clearAllMocks();
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  describe('create', () => {
    it('MASTER_ADMIN can create a course in DRAFT status', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null); // no slug conflict
      mockPrisma.course.create.mockResolvedValue(draftCourse());

      const result = await service.create(
        {
          title: 'Curso Teste',
          shortDescription: 'Desc curta',
          description: 'Desc completa',
          estimatedDurationMinutes: 60,
        },
        masterAdmin(),
      );

      expect(result.status).toBe(CourseStatus.DRAFT);
      expect(mockPrisma.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: CourseStatus.DRAFT }),
        }),
      );
    });

    it('STORE_ADMIN cannot create a course', async () => {
      await expect(
        service.create(
          {
            title: 'Curso',
            shortDescription: 'Desc',
            description: 'Desc',
            estimatedDurationMinutes: 30,
          },
          storeAdminA(),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('publish — state machine', () => {
    it('cannot publish without modules', async () => {
      const course = draftCourse();
      mockPrisma.course.findFirst
        .mockResolvedValueOnce(course) // findCourseOrThrow
        .mockResolvedValueOnce({ // validateForPublish
          ...course,
          modules: [],
          storeAccess: [{ id: 'access-1', active: true }],
          quiz: null,
        });

      await expect(service.publish('course-id', masterAdmin())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('cannot publish an ARCHIVED course', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(draftCourse({ status: 'ARCHIVED' }));

      await expect(service.publish('course-id', masterAdmin())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('cannot archive an already ARCHIVED course', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(draftCourse({ status: 'ARCHIVED' }));

      await expect(service.archive('course-id', masterAdmin())).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('STORE_ADMIN cannot publish a course', async () => {
      await expect(service.publish('course-id', storeAdminA())).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('findOne — store scope', () => {
    it('STORE_ADMIN cannot see a DRAFT course', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(
        draftCourse({
          status: 'DRAFT',
          storeAccess: [],
          modules: [],
        }),
      );

      await expect(service.findOne('course-id', storeAdminA())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('STORE_ADMIN cannot see a PUBLISHED course not linked to their store', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(
        draftCourse({
          status: 'PUBLISHED',
          storeAccess: [{ storeId: 'store-b-id', active: true, availableFrom: null, availableUntil: null }],
          modules: [],
        }),
      );

      await expect(service.findOne('course-id', storeAdminA())).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('MASTER_ADMIN can see any course regardless of status', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(
        draftCourse({
          status: 'DRAFT',
          storeAccess: [],
          modules: [],
        }),
      );

      const result = await service.findOne('course-id', masterAdmin());
      expect(result.id).toBe('course-id');
    });
  });

  describe('createLesson — YouTube validation', () => {
    beforeEach(() => {
      mockPrisma.course.findFirst.mockResolvedValue(draftCourse({ status: 'DRAFT' }));
      mockPrisma.courseModule.findFirst.mockResolvedValue({
        id: 'module-id',
        courseId: 'course-id',
        title: 'Módulo 1',
        order: 1,
      });
    });

    it('creates a VIDEO lesson with a valid YouTube URL', async () => {
      mockPrisma.lesson.create.mockResolvedValue({
        id: 'lesson-id',
        moduleId: 'module-id',
        title: 'Aula 1',
        type: 'VIDEO',
        order: 1,
        required: true,
        durationMinutes: null,
        youtubeVideoId: 'dQw4w9WgXcQ',
        youtubeEmbedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        description: null,
        textContent: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createLesson(
        'course-id',
        'module-id',
        {
          title: 'Aula 1',
          type: 'VIDEO' as LessonType,
          order: 1,
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        },
        masterAdmin(),
      );

      expect(result.youtubeVideoId).toBe('dQw4w9WgXcQ');
      expect(result.youtubeEmbedUrl).toContain('youtube-nocookie.com');
    });

    it('rejects an invalid YouTube URL', async () => {
      await expect(
        service.createLesson(
          'course-id',
          'module-id',
          {
            title: 'Aula Inválida',
            type: 'VIDEO' as LessonType,
            order: 1,
            youtubeUrl: 'https://vimeo.com/123456',
          },
          masterAdmin(),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a YouTube URL on a non-VIDEO lesson type', async () => {
      await expect(
        service.createLesson(
          'course-id',
          'module-id',
          {
            title: 'Doc com YouTube',
            type: 'DOCUMENT' as LessonType,
            order: 1,
            youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
          },
          masterAdmin(),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('setStoreAccess', () => {
    it('STORE_ADMIN cannot modify store access', async () => {
      await expect(
        service.setStoreAccess('course-id', { accesses: [] }, storeAdminA()),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
