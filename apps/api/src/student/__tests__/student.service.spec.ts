import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StudentService } from '../student.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificatesService } from '../../certificates/certificates.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { EnrollmentStatus, CourseStatus } from '@compliance/shared';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeCourse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'course-id',
    title: 'Curso Teste',
    slug: 'curso-teste',
    shortDescription: 'Desc curta',
    description: 'Desc completa',
    coverImageUrl: null,
    estimatedDurationMinutes: 60,
    minimumPassingScore: null,
    maximumAttempts: null,
    status: CourseStatus.PUBLISHED,
    certificateEnabled: false,
    publishedAt: new Date(),
    deletedAt: null,
    createdById: 'master-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    storeAccess: [{ assignmentType: 'OPTIONAL', storeId: 'store-a-id', active: true }],
    enrollments: [],
    favorites: [],
    _count: { modules: 1 },
    modules: [{ _count: { lessons: 3 } }],
    ...overrides,
  };
}

function makeEnrollment(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'enrollment-id',
    userId: 'student-id',
    courseId: 'course-id',
    status: EnrollmentStatus.NOT_STARTED,
    progressPercentage: 0,
    startedAt: null,
    completedAt: null,
    lastAccessedAt: null,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const mockPrisma = {
  course: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
  courseStoreAccess: { findFirst: jest.fn() },
  enrollment: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  lessonProgress: {
    upsert: jest.fn(),
    count: jest.fn(),
  },
  lesson: { findFirst: jest.fn(), findMany: jest.fn() },
  quiz: { findFirst: jest.fn() },
  favorite: { upsert: jest.fn(), deleteMany: jest.fn() },
  user: { findFirstOrThrow: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
};

describe('StudentService', () => {
  let service: StudentService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StudentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CertificatesService, useValue: { generateForEnrollment: jest.fn().mockResolvedValue(undefined) } },
        { provide: NotificationsService, useValue: { create: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(StudentService);
    jest.clearAllMocks();
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  describe('getCatalog — store isolation', () => {
    it('only returns PUBLISHED courses available for the student store', async () => {
      mockPrisma.$transaction.mockResolvedValue([[makeCourse()], 1]);

      const result = await service.getCatalog('student-id', 'store-a-id', {});

      expect(result.data).toHaveLength(1);
    });

    it('course from another store returns NotFoundException', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null); // course not available for this store

      await expect(
        service.getCourseDetail('course-id', 'student-id', 'store-b-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('startCourse — enrollment', () => {
    it('creates enrollment if not exists', async () => {
      mockPrisma.courseStoreAccess.findFirst.mockResolvedValue({
        courseId: 'course-id',
        storeId: 'store-a-id',
      });
      mockPrisma.enrollment.upsert.mockResolvedValue(makeEnrollment());
      // getEnrollment is called after upsert
      mockPrisma.enrollment.findFirst.mockResolvedValue({
        ...makeEnrollment(),
        course: { modules: [], quiz: null },
        lessonProgress: [],
      });

      const result = await service.startCourse('course-id', 'student-id', 'store-a-id');

      expect(result.courseId).toBe('course-id');
      expect(mockPrisma.enrollment.upsert).toHaveBeenCalled();
    });

    it('throws NotFoundException for unavailable course', async () => {
      mockPrisma.courseStoreAccess.findFirst.mockResolvedValue(null);

      await expect(
        service.startCourse('course-id', 'student-id', 'store-a-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('startLesson — enrollment transition', () => {
    it('transitions enrollment to IN_PROGRESS on first lesson', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(
        makeEnrollment({ status: EnrollmentStatus.NOT_STARTED }),
      );
      mockPrisma.lesson.findFirst.mockResolvedValue({ id: 'lesson-id', moduleId: 'module-id' });
      mockPrisma.enrollment.update.mockResolvedValue({});
      mockPrisma.lessonProgress.upsert.mockResolvedValue({});

      await service.startLesson('enrollment-id', 'lesson-id', 'student-id');

      expect(mockPrisma.enrollment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: EnrollmentStatus.IN_PROGRESS }),
        }),
      );
    });

    it('cannot start a lesson from another enrollment', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(null);

      await expect(
        service.startLesson('other-enrollment-id', 'lesson-id', 'student-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('completeLesson — progress and completion', () => {
    it('recalculates progress percentage after lesson completion', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(
        makeEnrollment({ status: EnrollmentStatus.IN_PROGRESS }),
      );
      mockPrisma.lesson.findFirst.mockResolvedValue({ id: 'lesson-id' });
      mockPrisma.lessonProgress.upsert.mockResolvedValue({});
      // 1 required lesson, 1 completed
      mockPrisma.$transaction.mockResolvedValue([
        [{ id: 'lesson-id' }], // requiredLessons
        1,                      // completedCount
      ]);
      mockPrisma.enrollment.update.mockResolvedValue({});
      mockPrisma.quiz.findFirst.mockResolvedValue(null);

      const result = await service.completeLesson('enrollment-id', 'lesson-id', 'student-id');

      expect(result.progressPercentage).toBe(100);
      expect(result.enrollmentCompleted).toBe(true);
      expect(result.enrollmentStatus).toBe(EnrollmentStatus.COMPLETED);
    });

    it('does NOT complete enrollment when course has a quiz', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(
        makeEnrollment({ status: EnrollmentStatus.IN_PROGRESS }),
      );
      mockPrisma.lesson.findFirst.mockResolvedValue({ id: 'lesson-id' });
      mockPrisma.lessonProgress.upsert.mockResolvedValue({});
      mockPrisma.$transaction.mockResolvedValue([[{ id: 'lesson-id' }], 1]);
      mockPrisma.enrollment.update.mockResolvedValue({});
      mockPrisma.quiz.findFirst.mockResolvedValue({ id: 'quiz-id' }); // has quiz

      const result = await service.completeLesson('enrollment-id', 'lesson-id', 'student-id');

      expect(result.progressPercentage).toBe(100);
      expect(result.enrollmentCompleted).toBe(false); // still IN_PROGRESS
      expect(result.enrollmentStatus).toBe(EnrollmentStatus.IN_PROGRESS);
    });

    it('course with partial completion has progress < 100', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(
        makeEnrollment({ status: EnrollmentStatus.IN_PROGRESS }),
      );
      mockPrisma.lesson.findFirst.mockResolvedValue({ id: 'lesson-1' });
      mockPrisma.lessonProgress.upsert.mockResolvedValue({});
      // 3 required, only 1 completed
      mockPrisma.$transaction.mockResolvedValue([
        [{ id: 'l1' }, { id: 'l2' }, { id: 'l3' }],
        1,
      ]);
      mockPrisma.enrollment.update.mockResolvedValue({});
      mockPrisma.quiz.findFirst.mockResolvedValue(null);

      const result = await service.completeLesson('enrollment-id', 'lesson-1', 'student-id');

      expect(result.progressPercentage).toBe(33);
      expect(result.enrollmentCompleted).toBe(false);
    });
  });

  describe('getEnrollment — ownership', () => {
    it('returns NotFoundException for enrollment owned by another student', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(null); // userId does not match

      await expect(service.getEnrollment('enrollment-id', 'other-student-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
