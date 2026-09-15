import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  MasterDashboardDto,
  StoreDashboardDto,
} from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMasterDashboard(): Promise<MasterDashboardDto> {
    const [
      totalStores,
      activeStudents,
      publishedCourses,
      totalEnrollments,
      completedEnrollments,
      inProgressEnrollments,
      notStartedEnrollments,
      overdueRequired,
      avgScoreResult,
    ] = await this.prisma.$transaction([
      this.prisma.store.count({ where: { deletedAt: null, active: true } }),
      this.prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE', deletedAt: null } }),
      this.prisma.course.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      this.prisma.enrollment.count(),
      this.prisma.enrollment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.enrollment.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.enrollment.count({ where: { status: 'NOT_STARTED' } }),
      this.prisma.enrollment.count({
        where: {
          status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
          course: {
            storeAccess: {
              some: { assignmentType: 'REQUIRED', active: true, availableUntil: { lt: new Date() } },
            },
          },
        },
      }),
      this.prisma.quizAttempt.aggregate({
        _avg: { score: true },
        where: { submittedAt: { not: null } },
      }),
    ]);

    const completionRate =
      totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

    const avgScore = avgScoreResult._avg.score != null ? Math.round(Number(avgScoreResult._avg.score)) : null;

    // Per-store completion (top 15 stores)
    const stores = await this.prisma.store.findMany({
      where: { deletedAt: null, active: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
      take: 15,
    });

    const completionByStore = await Promise.all(
      stores.map(async (store) => {
        const [students, total, completed] = await this.prisma.$transaction([
          this.prisma.user.count({ where: { storeId: store.id, role: 'STUDENT', deletedAt: null } }),
          this.prisma.enrollment.count({ where: { user: { storeId: store.id } } }),
          this.prisma.enrollment.count({ where: { user: { storeId: store.id }, status: 'COMPLETED' } }),
        ]);
        return {
          storeId: store.id,
          storeName: store.name,
          storeCode: store.code,
          totalStudents: students,
          totalEnrollments: total,
          completedEnrollments: completed,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      }),
    );

    // Per-course completion (top 10 most enrolled)
    const topCourses = await this.prisma.course.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      select: { id: true, title: true },
      orderBy: { enrollments: { _count: 'desc' } },
      take: 10,
    });

    const completionByCourse = await Promise.all(
      topCourses.map(async (course) => {
        const [total, completed] = await this.prisma.$transaction([
          this.prisma.enrollment.count({ where: { courseId: course.id } }),
          this.prisma.enrollment.count({ where: { courseId: course.id, status: 'COMPLETED' } }),
        ]);
        return {
          courseId: course.id,
          courseTitle: course.title,
          totalEnrollments: total,
          completedEnrollments: completed,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      }),
    );

    // Recent registrations
    const recentRegistrations = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    return {
      overview: {
        totalStores,
        activeStudents,
        publishedCourses,
        totalEnrollments,
        completedEnrollments,
        inProgressEnrollments,
        notStartedEnrollments,
        completionRate,
        overdueRequiredEnrollments: overdueRequired,
        avgQuizScore: avgScore,
      },
      completionByStore: completionByStore.sort((a, b) => b.completionRate - a.completionRate),
      completionByCourse: completionByCourse.sort((a, b) => b.totalEnrollments - a.totalEnrollments),
      recentRegistrations,
    };
  }

  async getStoreDashboard(storeId: string): Promise<StoreDashboardDto> {
    const [
      totalStudents,
      activeStudents,
      totalEnrollments,
      completedEnrollments,
      inProgressEnrollments,
      notStartedEnrollments,
      passedAttempts,
      failedAttempts,
      avgScoreResult,
      studentsWithPending,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { storeId, role: 'STUDENT', deletedAt: null } }),
      this.prisma.user.count({ where: { storeId, role: 'STUDENT', status: 'ACTIVE', deletedAt: null } }),
      this.prisma.enrollment.count({ where: { user: { storeId } } }),
      this.prisma.enrollment.count({ where: { user: { storeId }, status: 'COMPLETED' } }),
      this.prisma.enrollment.count({ where: { user: { storeId }, status: 'IN_PROGRESS' } }),
      this.prisma.enrollment.count({ where: { user: { storeId }, status: 'NOT_STARTED' } }),
      this.prisma.quizAttempt.count({ where: { status: 'PASSED', enrollment: { user: { storeId } } } }),
      this.prisma.quizAttempt.count({ where: { status: 'FAILED', enrollment: { user: { storeId } } } }),
      this.prisma.quizAttempt.aggregate({
        _avg: { score: true },
        where: { submittedAt: { not: null }, enrollment: { user: { storeId } } },
      }),
      // Students with at least one REQUIRED course not completed
      this.prisma.user.count({
        where: {
          storeId,
          role: 'STUDENT',
          deletedAt: null,
          enrollments: {
            some: {
              status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
              course: { storeAccess: { some: { storeId, assignmentType: 'REQUIRED', active: true } } },
            },
          },
        },
      }),
    ]);

    const completionRate =
      totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0;

    const avgScore =
      avgScoreResult._avg.score != null ? Math.round(Number(avgScoreResult._avg.score)) : null;

    // Course-level progress for this store
    const storeAccesses = await this.prisma.courseStoreAccess.findMany({
      where: { storeId, active: true, course: { status: 'PUBLISHED', deletedAt: null } },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { assignmentType: 'asc' },
    });

    const courseProgress = await Promise.all(
      storeAccesses.map(async (access) => {
        const [completed, inProgress, notStarted] = await this.prisma.$transaction([
          this.prisma.enrollment.count({ where: { courseId: access.courseId, user: { storeId }, status: 'COMPLETED' } }),
          this.prisma.enrollment.count({ where: { courseId: access.courseId, user: { storeId }, status: 'IN_PROGRESS' } }),
          this.prisma.enrollment.count({ where: { courseId: access.courseId, user: { storeId }, status: 'NOT_STARTED' } }),
        ]);
        const total = completed + inProgress + notStarted;
        return {
          courseId: access.courseId,
          courseTitle: access.course.title,
          assignmentType: access.assignmentType,
          totalStudents: total,
          completed,
          inProgress,
          notStarted,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      }),
    );

    return {
      overview: {
        totalStudents,
        activeStudents,
        inactiveStudents: totalStudents - activeStudents,
        availableCourses: storeAccesses.length,
        requiredCourses: storeAccesses.filter((a) => a.assignmentType === 'REQUIRED').length,
        completedEnrollments,
        inProgressEnrollments,
        notStartedEnrollments,
        completionRate,
        passedAttempts,
        failedAttempts,
        avgQuizScore: avgScore,
        studentsWithPendingRequired: studentsWithPending,
      },
      courseProgress: courseProgress.sort((a, b) => b.totalStudents - a.totalStudents),
    };
  }
}
