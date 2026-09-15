import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  Enrollment,
  Lesson,
  LessonProgress,
  CourseModule,
  Course,
  CourseStoreAccess,
  Favorite,
} from '@prisma/client';
import { EnrollmentStatus, CourseAssignmentType, CourseStatus } from '@compliance/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CertificatesService } from '../certificates/certificates.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  StudentCourseDto,
  EnrollmentDetailDto,
  EnrollmentSummaryDto,
  LessonWithProgressDto,
  ModuleWithProgressDto,
  CompleteLessonResponseDto,
  StudentDashboardDto,
  StudentCoursesQueryDto,
  UpdateLessonProgressDto,
} from './dto/student.dto';

// ─── Internal types ────────────────────────────────────────────────────────────

type CourseWithRelations = Course & {
  storeAccess: CourseStoreAccess[];
  enrollments: Enrollment[];
  favorites: Favorite[];
  _count: { modules: number };
  modules: Array<{ _count: { lessons: number } }>;
};

type EnrollmentWithDetails = Enrollment & {
  course: Course & {
    modules: Array<CourseModule & { lessons: Lesson[] }>;
    quiz: { id: string } | null;
  };
  lessonProgress: LessonProgress[];
};

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly certificatesService: CertificatesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────

  async getDashboard(userId: string, storeId: string): Promise<StudentDashboardDto> {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId },
      select: { name: true },
    });

    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      orderBy: { lastAccessedAt: 'desc' },
      include: {
        course: {
          include: {
            storeAccess: { where: { storeId }, take: 1 },
            favorites: { where: { userId }, take: 1 },
            _count: { select: { modules: true } },
            modules: { select: { _count: { select: { lessons: true } } } },
          },
        },
      },
    });

    const stats = {
      totalEnrollments: enrollments.length,
      completed: enrollments.filter((e) => e.status === EnrollmentStatus.COMPLETED).length,
      inProgress: enrollments.filter((e) => e.status === EnrollmentStatus.IN_PROGRESS).length,
      notStarted: enrollments.filter((e) => e.status === EnrollmentStatus.NOT_STARTED).length,
      requiredPending: 0,
      overallProgressPercentage: 0,
    };

    if (stats.totalEnrollments > 0) {
      stats.overallProgressPercentage = Math.round(
        enrollments.reduce((sum, e) => sum + Number(e.progressPercentage), 0) /
          stats.totalEnrollments,
      );
    }

    // Required courses not yet completed
    const required = enrollments.filter(
      (e) =>
        e.course.storeAccess[0]?.assignmentType === CourseAssignmentType.REQUIRED &&
        e.status !== EnrollmentStatus.COMPLETED,
    );
    stats.requiredPending = required.length;

    const inProgressEnrollments = enrollments.filter(
      (e) => e.status === EnrollmentStatus.IN_PROGRESS,
    );

    const lastAccessed = enrollments[0];

    return {
      userName: user.name,
      stats,
      requiredPending: required.slice(0, 5).map((e) =>
        this.toStudentCourseDto(e.course as CourseWithRelations, e),
      ),
      inProgress: inProgressEnrollments.slice(0, 5).map((e) =>
        this.toStudentCourseDto(e.course as CourseWithRelations, e),
      ),
      lastAccessedCourseId: lastAccessed?.courseId ?? null,
      lastAccessedEnrollmentId: lastAccessed?.id ?? null,
    };
  }

  // ─── Catalog ──────────────────────────────────────────────────────────────

  async getCatalog(
    userId: string,
    storeId: string,
    query: StudentCoursesQueryDto,
  ): Promise<{ data: StudentCourseDto[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;
    const where = this.buildCourseWhere(storeId, search);

    const [courses, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { title: 'asc' },
        include: this.courseIncludes(userId, storeId),
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data: courses.map((c) => this.toStudentCourseDto(c as CourseWithRelations, c.enrollments[0])),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getRequiredCourses(userId: string, storeId: string): Promise<StudentCourseDto[]> {
    const courses = await this.prisma.course.findMany({
      where: {
        ...this.buildCourseWhere(storeId),
        storeAccess: {
          some: {
            storeId,
            active: true,
            assignmentType: CourseAssignmentType.REQUIRED,
            ...this.availabilityFilter(),
          },
        },
      },
      orderBy: { title: 'asc' },
      include: this.courseIncludes(userId, storeId),
    });

    return courses.map((c) => this.toStudentCourseDto(c as CourseWithRelations, c.enrollments[0]));
  }

  async getInProgressCourses(userId: string, storeId: string): Promise<StudentCourseDto[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, status: EnrollmentStatus.IN_PROGRESS },
      orderBy: { lastAccessedAt: 'desc' },
      include: {
        course: { include: this.courseIncludes(userId, storeId) },
      },
    });

    return enrollments
      .filter((e) => e.course.deletedAt === null)
      .map((e) => this.toStudentCourseDto(e.course as CourseWithRelations, e));
  }

  async getCompletedCourses(userId: string, storeId: string): Promise<StudentCourseDto[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, status: EnrollmentStatus.COMPLETED },
      orderBy: { completedAt: 'desc' },
      include: {
        course: { include: this.courseIncludes(userId, storeId) },
      },
    });

    return enrollments
      .filter((e) => e.course.deletedAt === null)
      .map((e) => this.toStudentCourseDto(e.course as CourseWithRelations, e));
  }

  async getCourseDetail(courseId: string, userId: string, storeId: string): Promise<StudentCourseDto> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, ...this.buildCourseWhere(storeId) },
      include: this.courseIncludes(userId, storeId),
    });

    if (!course) throw new NotFoundException('Curso não disponível');

    return this.toStudentCourseDto(course as CourseWithRelations, course.enrollments[0]);
  }

  // ─── Enrollment ──────────────────────────────────────────────────────────

  async startCourse(courseId: string, userId: string, storeId: string): Promise<EnrollmentDetailDto> {
    const courseExists = await this.prisma.courseStoreAccess.findFirst({
      where: {
        courseId,
        storeId,
        active: true,
        course: { status: CourseStatus.PUBLISHED, deletedAt: null },
        ...this.availabilityFilter(),
      },
    });

    if (!courseExists) throw new NotFoundException('Curso não disponível para sua loja');

    const enrollment = await this.prisma.enrollment.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId, status: EnrollmentStatus.NOT_STARTED },
      update: {}, // keep existing data intact
    });

    return this.getEnrollment(enrollment.id, userId);
  }

  async getEnrollment(enrollmentId: string, userId: string): Promise<EnrollmentDetailDto> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, userId },
      include: {
        course: {
          include: {
            modules: {
              orderBy: { order: 'asc' },
              include: {
                lessons: { orderBy: { order: 'asc' } },
              },
            },
            quiz: { select: { id: true } },
          },
        },
        lessonProgress: true,
      },
    });

    if (!enrollment) throw new NotFoundException('Matrícula não encontrada');

    return this.toEnrollmentDetailDto(enrollment as EnrollmentWithDetails);
  }

  // ─── Lesson progress ─────────────────────────────────────────────────────

  async startLesson(enrollmentId: string, lessonId: string, userId: string): Promise<void> {
    const enrollment = await this.findEnrollmentOrThrow(enrollmentId, userId);

    await this.findLessonInCourseOrThrow(lessonId, enrollment.courseId);

    // Transition to IN_PROGRESS on first lesson
    if (enrollment.status === EnrollmentStatus.NOT_STARTED) {
      await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status: EnrollmentStatus.IN_PROGRESS, startedAt: new Date(), lastAccessedAt: new Date() },
      });
    } else {
      await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { lastAccessedAt: new Date() },
      });
    }

    // Idempotent — do not reset startedAt if already exists
    await this.prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      create: { enrollmentId, lessonId, startedAt: new Date() },
      update: {},
    });
  }

  async updateLessonProgress(
    enrollmentId: string,
    lessonId: string,
    userId: string,
    dto: UpdateLessonProgressDto,
  ): Promise<void> {
    const enrollment = await this.findEnrollmentOrThrow(enrollmentId, userId);

    if (enrollment.status === EnrollmentStatus.COMPLETED) return;

    await this.prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      create: {
        enrollmentId,
        lessonId,
        startedAt: new Date(),
        watchedSeconds: dto.watchedSeconds ?? null,
        lastPositionSeconds: dto.lastPositionSeconds ?? null,
      },
      update: {
        ...(dto.watchedSeconds !== undefined && { watchedSeconds: dto.watchedSeconds }),
        ...(dto.lastPositionSeconds !== undefined && { lastPositionSeconds: dto.lastPositionSeconds }),
      },
    });
  }

  async completeLesson(
    enrollmentId: string,
    lessonId: string,
    userId: string,
  ): Promise<CompleteLessonResponseDto> {
    const enrollment = await this.findEnrollmentOrThrow(enrollmentId, userId);

    if (enrollment.status === EnrollmentStatus.COMPLETED) {
      return {
        progressPercentage: 100,
        enrollmentCompleted: true,
        enrollmentStatus: EnrollmentStatus.COMPLETED,
      };
    }

    await this.findLessonInCourseOrThrow(lessonId, enrollment.courseId);

    // Mark lesson as completed (idempotent)
    await this.prisma.lessonProgress.upsert({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      create: { enrollmentId, lessonId, startedAt: new Date(), completedAt: new Date() },
      update: { completedAt: new Date() },
    });

    const progressPct = await this.recalculateProgress(enrollmentId, enrollment.courseId);
    const completed = await this.checkAndCompleteEnrollment(enrollmentId, enrollment.courseId, progressPct);

    const updatedStatus = completed ? EnrollmentStatus.COMPLETED : EnrollmentStatus.IN_PROGRESS;

    return {
      progressPercentage: progressPct,
      enrollmentCompleted: completed,
      enrollmentStatus: updatedStatus,
    };
  }

  // ─── Favorites ────────────────────────────────────────────────────────────

  async addFavorite(courseId: string, userId: string, storeId: string): Promise<void> {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, ...this.buildCourseWhere(storeId) },
    });
    if (!course) throw new NotFoundException('Curso não disponível');

    await this.prisma.favorite.upsert({
      where: { userId_courseId: { userId, courseId } },
      create: { userId, courseId },
      update: {},
    });
  }

  async removeFavorite(courseId: string, userId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({ where: { userId, courseId } });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private buildCourseWhere(storeId: string, search?: string): Prisma.CourseWhereInput {
    const now = new Date();
    return {
      status: CourseStatus.PUBLISHED,
      deletedAt: null,
      storeAccess: {
        some: {
          storeId,
          active: true,
          OR: [{ availableFrom: null }, { availableFrom: { lte: now } }],
          AND: [{ OR: [{ availableUntil: null }, { availableUntil: { gte: now } }] }],
        },
      },
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  private availabilityFilter(): Prisma.CourseStoreAccessWhereInput {
    const now = new Date();
    return {
      OR: [{ availableFrom: null }, { availableFrom: { lte: now } }],
      AND: [{ OR: [{ availableUntil: null }, { availableUntil: { gte: now } }] }],
    };
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private courseIncludes(userId: string, storeId: string) {
    return {
      storeAccess: { where: { storeId }, take: 1 },
      enrollments: { where: { userId }, take: 1 },
      favorites: { where: { userId }, take: 1 },
      _count: { select: { modules: true } },
      modules: { select: { _count: { select: { lessons: true } } } },
    } as const;
  }

  private async findEnrollmentOrThrow(enrollmentId: string, userId: string): Promise<Enrollment> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, userId },
    });
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada');
    return enrollment;
  }

  private async findLessonInCourseOrThrow(lessonId: string, courseId: string): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, module: { courseId } },
    });
    if (!lesson) throw new NotFoundException('Aula não encontrada neste curso');
    return lesson;
  }

  private async recalculateProgress(enrollmentId: string, courseId: string): Promise<number> {
    const [requiredLessons, completedCount] = await this.prisma.$transaction([
      this.prisma.lesson.findMany({
        where: { required: true, module: { courseId } },
        select: { id: true },
      }),
      // Count is calculated after to reflect the just-completed lesson
      this.prisma.lessonProgress.count({
        where: {
          enrollmentId,
          completedAt: { not: null },
          lesson: { required: true, module: { courseId } },
        },
      }),
    ]);

    const total = requiredLessons.length;
    if (total === 0) {
      await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { progressPercentage: 100 },
      });
      return 100;
    }

    const pct = Math.round((completedCount / total) * 100);
    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { progressPercentage: pct },
    });
    return pct;
  }

  private async checkAndCompleteEnrollment(
    enrollmentId: string,
    courseId: string,
    progressPct: number,
  ): Promise<boolean> {
    if (progressPct < 100) return false;

    // If course has an active quiz, completion is triggered by quiz pass (Phase 6)
    const quiz = await this.prisma.quiz.findFirst({ where: { courseId, active: true } });
    if (quiz) return false;

    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: EnrollmentStatus.COMPLETED, completedAt: new Date() },
    });

    // Non-blocking — failure doesn't roll back enrollment completion
    this.certificatesService.generateForEnrollment(enrollmentId).catch((err: unknown) =>
      this.logger.error(`Certificate generation failed for enrollment ${enrollmentId}`, err),
    );

    // Notify student
    this.notificationsService
      .create(
        (await this.prisma.enrollment.findFirst({ where: { id: enrollmentId }, select: { userId: true } }))?.userId ?? '',
        'Curso concluído! 🎉',
        'Parabéns! Você concluiu um treinamento.',
      )
      .catch(() => undefined);

    this.logger.log(`Enrollment ${enrollmentId} completed (no quiz)`);
    return true;
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────

  private toStudentCourseDto(
    course: CourseWithRelations,
    enrollment?: Enrollment | null,
  ): StudentCourseDto {
    const storeAccess = course.storeAccess[0];
    const moduleCount = course._count.modules;
    const lessonCount = course.modules.reduce(
      (sum, m) => sum + (m._count?.lessons ?? 0),
      0,
    );

    const enrollmentSummary: EnrollmentSummaryDto | null = enrollment
      ? {
          id: enrollment.id,
          status: enrollment.status as EnrollmentStatus,
          progressPercentage: Number(enrollment.progressPercentage),
          startedAt: enrollment.startedAt,
          completedAt: enrollment.completedAt,
          lastAccessedAt: enrollment.lastAccessedAt,
        }
      : null;

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      shortDescription: course.shortDescription,
      coverImageUrl: course.coverImageUrl,
      estimatedDurationMinutes: course.estimatedDurationMinutes,
      minimumPassingScore: course.minimumPassingScore,
      certificateEnabled: course.certificateEnabled,
      publishedAt: course.publishedAt!,
      moduleCount,
      lessonCount,
      assignmentType: (storeAccess?.assignmentType ?? CourseAssignmentType.OPTIONAL) as CourseAssignmentType,
      enrollment: enrollmentSummary,
      isFavorited: (course.favorites?.length ?? 0) > 0,
    };
  }

  private toEnrollmentDetailDto(enrollment: EnrollmentWithDetails): EnrollmentDetailDto {
    const progressMap = new Map(
      enrollment.lessonProgress.map((p) => [p.lessonId, p]),
    );

    const modules: ModuleWithProgressDto[] = enrollment.course.modules.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      order: module.order,
      lessons: module.lessons.map((lesson): LessonWithProgressDto => {
        const p = progressMap.get(lesson.id) ?? null;
        return {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          type: lesson.type,
          order: lesson.order,
          required: lesson.required,
          durationMinutes: lesson.durationMinutes,
          youtubeVideoId: lesson.youtubeVideoId,
          youtubeEmbedUrl: lesson.youtubeEmbedUrl,
          textContent: lesson.textContent,
          progress: p
            ? {
                startedAt: p.startedAt,
                completedAt: p.completedAt,
                watchedSeconds: p.watchedSeconds,
                lastPositionSeconds: p.lastPositionSeconds,
              }
            : null,
        };
      }),
    }));

    return {
      id: enrollment.id,
      courseId: enrollment.courseId,
      status: enrollment.status as EnrollmentStatus,
      progressPercentage: Number(enrollment.progressPercentage),
      startedAt: enrollment.startedAt,
      completedAt: enrollment.completedAt,
      lastAccessedAt: enrollment.lastAccessedAt,
      hasQuiz: !!enrollment.course.quiz,
      modules,
    };
  }
}
