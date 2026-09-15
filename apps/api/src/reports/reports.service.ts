import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { UserRole } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { ReportQueryDto } from './dto/report-query.dto';

// ─── Row types ────────────────────────────────────────────────────────────────

export interface CourseReportRow {
  courseId: string;
  courseTitle: string;
  storeName?: string;
  totalEnrollments: number;
  completedEnrollments: number;
  inProgressEnrollments: number;
  notStartedEnrollments: number;
  completionRate: number;
  avgScore: number | null;
  certificatesIssued: number;
}

export interface StudentReportRow {
  userId: string;
  name: string;
  email: string;
  storeName: string | null;
  position: string | null;
  totalEnrollments: number;
  completedEnrollments: number;
  inProgressEnrollments: number;
  completionRate: number;
  hasPendingRequired: boolean;
}

export interface StoreReportRow {
  storeId: string;
  storeName: string;
  storeCode: string;
  totalStudents: number;
  activeStudents: number;
  totalEnrollments: number;
  completedEnrollments: number;
  completionRate: number;
}

export interface PendingReportRow {
  userId: string;
  studentName: string;
  storeName: string | null;
  courseTitle: string;
  assignmentType: string;
  progressPercentage: number;
  enrollmentStatus: string;
}

export interface QuizResultsRow {
  attemptId: string;
  studentName: string;
  storeName: string | null;
  courseTitle: string;
  attemptNumber: number;
  score: number;
  passed: boolean;
  submittedAt: Date;
}

export interface CertificateReportRow {
  certificateCode: string;
  studentName: string;
  storeName: string | null;
  courseTitle: string;
  courseHours: number;
  issuedAt: Date;
  expiresAt: Date | null;
  status: string;
}

export interface PaginatedReport<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Scope helper ────────────────────────────────────────────────────────

  private effectiveStoreId(requester: JwtPayload, queryStoreId?: string): string | undefined {
    return requester.role === UserRole.MASTER_ADMIN ? queryStoreId : (requester.storeId ?? undefined);
  }

  // ─── Course report ────────────────────────────────────────────────────────

  async getCourseReport(
    requester: JwtPayload,
    query: ReportQueryDto,
  ): Promise<PaginatedReport<CourseReportRow>> {
    const storeId = this.effectiveStoreId(requester, query.storeId);
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const courseWhere: Prisma.CourseWhereInput = {
      status: 'PUBLISHED',
      deletedAt: null,
      ...(storeId && { storeAccess: { some: { storeId, active: true } } }),
      ...(query.courseId && { id: query.courseId }),
    };

    const [courses, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where: courseWhere,
        select: { id: true, title: true, estimatedDurationMinutes: true },
        orderBy: { title: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.course.count({ where: courseWhere }),
    ]);

    const data: CourseReportRow[] = await Promise.all(
      courses.map(async (course) => {
        const enrollmentWhere: Prisma.EnrollmentWhereInput = {
          courseId: course.id,
          ...(storeId && { user: { storeId } }),
        };
        const [total, completed, inProgress, notStarted, avgResult, certs] =
          await this.prisma.$transaction([
            this.prisma.enrollment.count({ where: enrollmentWhere }),
            this.prisma.enrollment.count({ where: { ...enrollmentWhere, status: 'COMPLETED' } }),
            this.prisma.enrollment.count({ where: { ...enrollmentWhere, status: 'IN_PROGRESS' } }),
            this.prisma.enrollment.count({ where: { ...enrollmentWhere, status: 'NOT_STARTED' } }),
            this.prisma.quizAttempt.aggregate({
              _avg: { score: true },
              where: { enrollment: enrollmentWhere, submittedAt: { not: null } },
            }),
            this.prisma.certificate.count({ where: { courseId: course.id } }),
          ]);

        return {
          courseId: course.id,
          courseTitle: course.title,
          totalEnrollments: total,
          completedEnrollments: completed,
          inProgressEnrollments: inProgress,
          notStartedEnrollments: notStarted,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          avgScore: avgResult._avg.score != null ? Math.round(Number(avgResult._avg.score)) : null,
          certificatesIssued: certs,
        };
      }),
    );

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Student report ───────────────────────────────────────────────────────

  async getStudentReport(
    requester: JwtPayload,
    query: ReportQueryDto,
  ): Promise<PaginatedReport<StudentReportRow>> {
    const storeId = this.effectiveStoreId(requester, query.storeId);
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const userWhere: Prisma.UserWhereInput = {
      role: 'STUDENT',
      deletedAt: null,
      ...(storeId && { storeId }),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: userWhere,
        include: { store: { select: { name: true } } },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where: userWhere }),
    ]);

    const data: StudentReportRow[] = await Promise.all(
      users.map(async (user) => {
        const [totalE, completedE, inProgressE, hasPending] = await this.prisma.$transaction([
          this.prisma.enrollment.count({ where: { userId: user.id } }),
          this.prisma.enrollment.count({ where: { userId: user.id, status: 'COMPLETED' } }),
          this.prisma.enrollment.count({ where: { userId: user.id, status: 'IN_PROGRESS' } }),
          this.prisma.enrollment.count({
            where: {
              userId: user.id,
              status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
              course: {
                storeAccess: {
                  some: { assignmentType: 'REQUIRED', active: true, storeId: user.storeId ?? '' },
                },
              },
            },
          }),
        ]);
        return {
          userId: user.id,
          name: user.name,
          email: user.email,
          storeName: user.store?.name ?? null,
          position: user.position,
          totalEnrollments: totalE,
          completedEnrollments: completedE,
          inProgressEnrollments: inProgressE,
          completionRate: totalE > 0 ? Math.round((completedE / totalE) * 100) : 0,
          hasPendingRequired: hasPending > 0,
        };
      }),
    );

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Store report ─────────────────────────────────────────────────────────

  async getStoreReport(query: ReportQueryDto): Promise<PaginatedReport<StoreReportRow>> {
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const [stores, total] = await this.prisma.$transaction([
      this.prisma.store.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.store.count({ where: { deletedAt: null } }),
    ]);

    const data: StoreReportRow[] = await Promise.all(
      stores.map(async (store) => {
        const [totalStudents, activeStudents, totalE, completedE] =
          await this.prisma.$transaction([
            this.prisma.user.count({ where: { storeId: store.id, role: 'STUDENT', deletedAt: null } }),
            this.prisma.user.count({ where: { storeId: store.id, role: 'STUDENT', status: 'ACTIVE', deletedAt: null } }),
            this.prisma.enrollment.count({ where: { user: { storeId: store.id } } }),
            this.prisma.enrollment.count({ where: { user: { storeId: store.id }, status: 'COMPLETED' } }),
          ]);
        return {
          storeId: store.id,
          storeName: store.name,
          storeCode: store.code,
          totalStudents,
          activeStudents,
          totalEnrollments: totalE,
          completedEnrollments: completedE,
          completionRate: totalE > 0 ? Math.round((completedE / totalE) * 100) : 0,
        };
      }),
    );

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Pending report ───────────────────────────────────────────────────────

  async getPendingReport(
    requester: JwtPayload,
    query: ReportQueryDto,
  ): Promise<PaginatedReport<PendingReportRow>> {
    const storeId = this.effectiveStoreId(requester, query.storeId);
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.EnrollmentWhereInput = {
      status: { in: ['NOT_STARTED', 'IN_PROGRESS'] },
      course: {
        status: 'PUBLISHED',
        storeAccess: { some: { assignmentType: 'REQUIRED', active: true, ...(storeId && { storeId }) } },
      },
      ...(storeId && { user: { storeId } }),
    };

    const [enrollments, total] = await this.prisma.$transaction([
      this.prisma.enrollment.findMany({
        where,
        include: {
          user: { select: { name: true, store: { select: { name: true } } } },
          course: {
            select: {
              title: true,
              storeAccess: { where: { assignmentType: 'REQUIRED', active: true }, select: { assignmentType: true } },
            },
          },
        },
        orderBy: { progressPercentage: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.enrollment.count({ where }),
    ]);

    const data: PendingReportRow[] = enrollments.map((e) => ({
      userId: e.userId,
      studentName: e.user.name,
      storeName: e.user.store?.name ?? null,
      courseTitle: e.course.title,
      assignmentType: e.course.storeAccess[0]?.assignmentType ?? 'REQUIRED',
      progressPercentage: Number(e.progressPercentage),
      enrollmentStatus: e.status,
    }));

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Quiz results report ──────────────────────────────────────────────────

  async getQuizResultsReport(
    requester: JwtPayload,
    query: ReportQueryDto,
  ): Promise<PaginatedReport<QuizResultsRow>> {
    const storeId = this.effectiveStoreId(requester, query.storeId);
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;
    const dateFilter = this.buildDateFilter(query);

    const where: Prisma.QuizAttemptWhereInput = {
      submittedAt: { not: null, ...dateFilter },
      ...(storeId && { enrollment: { user: { storeId } } }),
      ...(query.courseId && { quiz: { courseId: query.courseId } }),
    };

    const [attempts, total] = await this.prisma.$transaction([
      this.prisma.quizAttempt.findMany({
        where,
        include: {
          enrollment: {
            include: { user: { select: { name: true, store: { select: { name: true } } } } },
          },
          quiz: { include: { course: { select: { title: true } } } },
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.quizAttempt.count({ where }),
    ]);

    const data: QuizResultsRow[] = attempts.map((a) => ({
      attemptId: a.id,
      studentName: a.enrollment.user.name,
      storeName: a.enrollment.user.store?.name ?? null,
      courseTitle: a.quiz.course.title,
      attemptNumber: a.attemptNumber,
      score: Math.round(Number(a.score ?? 0)),
      passed: a.passed ?? false,
      submittedAt: a.submittedAt!,
    }));

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Certificates report ──────────────────────────────────────────────────

  async getCertificatesReport(
    requester: JwtPayload,
    query: ReportQueryDto,
  ): Promise<PaginatedReport<CertificateReportRow>> {
    const storeId = this.effectiveStoreId(requester, query.storeId);
    const { page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;
    const dateFilter = this.buildDateFilter(query);

    const where: Prisma.CertificateWhereInput = {
      issuedAt: dateFilter,
      ...(storeId && { user: { storeId } }),
      ...(query.courseId && { courseId: query.courseId }),
    };

    const [certs, total] = await this.prisma.$transaction([
      this.prisma.certificate.findMany({
        where,
        include: {
          user: { select: { name: true, store: { select: { name: true } } } },
          course: { select: { title: true, estimatedDurationMinutes: true } },
        },
        orderBy: { issuedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.certificate.count({ where }),
    ]);

    const data: CertificateReportRow[] = certs.map((c) => {
      const status = c.revokedAt ? 'revoked' : c.expiresAt && c.expiresAt < new Date() ? 'expired' : 'valid';
      return {
        certificateCode: c.certificateCode,
        studentName: c.user.name,
        storeName: c.user.store?.name ?? null,
        courseTitle: c.course.title,
        courseHours: Math.max(1, Math.ceil(c.course.estimatedDurationMinutes / 60)),
        issuedAt: c.issuedAt,
        expiresAt: c.expiresAt,
        status,
      };
    });

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ─── CSV export ───────────────────────────────────────────────────────────

  async generateCsv(
    type: string,
    requester: JwtPayload,
    query: ReportQueryDto,
  ): Promise<string> {
    switch (type) {
      case 'courses': {
        const result = await this.getCourseReport(requester, { ...query, limit: 5000 });
        return this.toCsv(
          ['ID Curso', 'Título', 'Total Matrículas', 'Concluídos', '% Conclusão', 'Nota Média', 'Certificados'],
          result.data.map((r) => [r.courseId, r.courseTitle, r.totalEnrollments, r.completedEnrollments, r.completionRate, r.avgScore ?? '', r.certificatesIssued]),
        );
      }
      case 'students': {
        const result = await this.getStudentReport(requester, { ...query, limit: 5000 });
        return this.toCsv(
          ['ID', 'Nome', 'E-mail', 'Loja', 'Cargo', 'Matrículas', 'Concluídos', '% Conclusão', 'Pendências Obrigatórias'],
          result.data.map((r) => [r.userId, r.name, r.email, r.storeName ?? '', r.position ?? '', r.totalEnrollments, r.completedEnrollments, r.completionRate, r.hasPendingRequired ? 'Sim' : 'Não']),
        );
      }
      case 'stores': {
        const result = await this.getStoreReport({ ...query, limit: 5000 });
        return this.toCsv(
          ['ID Loja', 'Nome', 'Código', 'Total Alunos', 'Ativos', 'Matrículas', 'Concluídos', '% Conclusão'],
          result.data.map((r) => [r.storeId, r.storeName, r.storeCode, r.totalStudents, r.activeStudents, r.totalEnrollments, r.completedEnrollments, r.completionRate]),
        );
      }
      case 'pending': {
        const result = await this.getPendingReport(requester, { ...query, limit: 5000 });
        return this.toCsv(
          ['ID Aluno', 'Nome', 'Loja', 'Curso', 'Tipo', '% Progresso', 'Status'],
          result.data.map((r) => [r.userId, r.studentName, r.storeName ?? '', r.courseTitle, r.assignmentType, r.progressPercentage, r.enrollmentStatus]),
        );
      }
      case 'quiz-results': {
        const result = await this.getQuizResultsReport(requester, { ...query, limit: 5000 });
        return this.toCsv(
          ['ID Tentativa', 'Aluno', 'Loja', 'Curso', 'Tentativa #', 'Nota', 'Aprovado', 'Data Envio'],
          result.data.map((r) => [r.attemptId, r.studentName, r.storeName ?? '', r.courseTitle, r.attemptNumber, r.score, r.passed ? 'Sim' : 'Não', r.submittedAt]),
        );
      }
      case 'certificates': {
        const result = await this.getCertificatesReport(requester, { ...query, limit: 5000 });
        return this.toCsv(
          ['Código', 'Aluno', 'Loja', 'Curso', 'Carga Horária', 'Emitido em', 'Expira em', 'Status'],
          result.data.map((r) => [r.certificateCode, r.studentName, r.storeName ?? '', r.courseTitle, `${r.courseHours}h`, r.issuedAt, r.expiresAt ?? '', r.status]),
        );
      }
      default:
        return this.toCsv(['Tipo inválido'], []);
    }
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  private buildDateFilter(query: ReportQueryDto): Prisma.DateTimeFilter | undefined {
    if (!query.startDate && !query.endDate) return undefined;
    return {
      ...(query.startDate && { gte: new Date(query.startDate) }),
      ...(query.endDate && { lte: new Date(query.endDate) }),
    };
  }

  private toCsv(headers: string[], rows: unknown[][]): string {
    const escape = (v: unknown): string => {
      if (v == null) return '';
      const s =
        v instanceof Date
          ? v.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : typeof v === 'boolean'
            ? v ? 'Sim' : 'Não'
            : String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  }
}
