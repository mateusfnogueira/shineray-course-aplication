import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserRole } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';
import { slugify } from '@compliance/shared';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateTrailDto,
  UpdateTrailDto,
  AddCourseToTrailDto,
  ReorderTrailCoursesDto,
  TrailResponseDto,
  TrailDetailDto,
  StudentTrailDto,
  TrailCourseDto,
} from './dto/trail.dto';

@Injectable()
export class TrailsService {
  private readonly logger = new Logger(TrailsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Admin ────────────────────────────────────────────────────────────────

  async findAll(
    requester: JwtPayload,
  ): Promise<TrailResponseDto[]> {
    const where: Prisma.TrailWhereInput = {
      deletedAt: null,
      ...(requester.role !== UserRole.MASTER_ADMIN && { active: true }),
    };

    const trails = await this.prisma.trail.findMany({
      where,
      include: {
        courses: { include: { course: { select: { estimatedDurationMinutes: true } } } },
      },
      orderBy: { title: 'asc' },
    });

    return trails.map((t) => this.toResponseDto(t));
  }

  async findOne(id: string): Promise<TrailDetailDto> {
    const trail = await this.prisma.trail.findFirst({
      where: { id, deletedAt: null },
      include: {
        courses: {
          orderBy: { order: 'asc' },
          include: {
            course: { select: { id: true, title: true, slug: true, estimatedDurationMinutes: true, status: true } },
          },
        },
      },
    });

    if (!trail) throw new NotFoundException(`Trilha '${id}' não encontrada`);

    return {
      ...this.toResponseDto(trail),
      courses: trail.courses.map((tc): TrailCourseDto => ({
        id: tc.id,
        courseId: tc.courseId,
        courseTitle: tc.course.title,
        courseSlug: tc.course.slug,
        estimatedDurationMinutes: tc.course.estimatedDurationMinutes,
        courseStatus: tc.course.status,
        order: tc.order,
      })),
    };
  }

  async create(dto: CreateTrailDto, actorId: string): Promise<TrailDetailDto> {
    const slug = await this.generateUniqueSlug(dto.title);

    const trail = await this.prisma.trail.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        active: dto.active ?? true,
        createdById: actorId,
      },
      include: { courses: { include: { course: { select: { estimatedDurationMinutes: true } } } } },
    });

    this.logger.log(`Trail created: "${trail.title}" by ${actorId}`);
    return { ...this.toResponseDto(trail), courses: [] };
  }

  async update(id: string, dto: UpdateTrailDto, _actorId: string): Promise<TrailDetailDto> {
    await this.findOrThrow(id);

    let slug: string | undefined;
    if (dto.title) {
      slug = await this.generateUniqueSlug(dto.title, id);
    }

    await this.prisma.trail.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title, slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
    });

    return this.findOne(id);
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    await this.findOrThrow(id);
    await this.prisma.trail.update({ where: { id }, data: { deletedAt: new Date() } });
    this.logger.log(`Trail soft-deleted: ${id} by ${actorId}`);
  }

  async addCourse(id: string, dto: AddCourseToTrailDto, _actorId: string): Promise<TrailDetailDto> {
    await this.findOrThrow(id);

    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, deletedAt: null },
    });
    if (!course) throw new NotFoundException(`Curso '${dto.courseId}' não encontrado`);

    const existing = await this.prisma.trailCourse.findFirst({
      where: { trailId: id, courseId: dto.courseId },
    });
    if (existing) throw new ConflictException('Curso já está nesta trilha');

    await this.prisma.trailCourse.create({
      data: { trailId: id, courseId: dto.courseId, order: dto.order },
    });

    return this.findOne(id);
  }

  async removeCourse(trailId: string, courseId: string, _actorId: string): Promise<void> {
    const tc = await this.prisma.trailCourse.findFirst({
      where: { trailId, courseId },
    });
    if (!tc) throw new NotFoundException('Curso não encontrado nesta trilha');

    await this.prisma.trailCourse.delete({ where: { id: tc.id } });
  }

  async reorderCourses(trailId: string, dto: ReorderTrailCoursesDto, _actorId: string): Promise<void> {
    await this.findOrThrow(trailId);

    await this.prisma.$transaction(
      dto.orderedCourseIds.map((courseId, index) =>
        this.prisma.trailCourse.updateMany({
          where: { trailId, courseId },
          data: { order: index + 1 },
        }),
      ),
    );
  }

  // ─── Student ──────────────────────────────────────────────────────────────

  async findStudentTrails(userId: string): Promise<StudentTrailDto[]> {
    const trails = await this.prisma.trail.findMany({
      where: { deletedAt: null, active: true },
      include: {
        courses: {
          orderBy: { order: 'asc' },
          include: { course: { select: { id: true, title: true, estimatedDurationMinutes: true, status: true } } },
        },
      },
      orderBy: { title: 'asc' },
    });

    // Get all enrollments for this user
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true, status: true },
    });
    const completedSet = new Set(
      enrollments.filter((e) => e.status === 'COMPLETED').map((e) => e.courseId),
    );

    return trails.map((trail) => this.toStudentDto(trail, completedSet));
  }

  async findStudentTrailDetail(trailId: string, userId: string): Promise<TrailDetailDto & { progressPercentage: number }> {
    const trail = await this.prisma.trail.findFirst({
      where: { id: trailId, deletedAt: null, active: true },
      include: {
        courses: {
          orderBy: { order: 'asc' },
          include: { course: { select: { id: true, title: true, slug: true, estimatedDurationMinutes: true, status: true } } },
        },
      },
    });

    if (!trail) throw new NotFoundException('Trilha não encontrada');

    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId, courseId: { in: trail.courses.map((tc) => tc.courseId) } },
      select: { courseId: true, status: true },
    });
    const completedSet = new Set(
      enrollments.filter((e) => e.status === 'COMPLETED').map((e) => e.courseId),
    );

    const total = trail.courses.length;
    const completed = trail.courses.filter((tc) => completedSet.has(tc.courseId)).length;
    const progressPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      ...this.toResponseDto(trail),
      courses: trail.courses.map((tc): TrailCourseDto => ({
        id: tc.id,
        courseId: tc.courseId,
        courseTitle: tc.course.title,
        courseSlug: tc.course.slug,
        estimatedDurationMinutes: tc.course.estimatedDurationMinutes,
        courseStatus: tc.course.status,
        order: tc.order,
      })),
      progressPercentage,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private async findOrThrow(id: string) {
    const trail = await this.prisma.trail.findFirst({ where: { id, deletedAt: null } });
    if (!trail) throw new NotFoundException(`Trilha '${id}' não encontrada`);
    return trail;
  }

  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base = slugify(title);
    let slug = base;
    let counter = 1;
    for (;;) {
      const exists = await this.prisma.trail.findFirst({
        where: { slug, deletedAt: null, ...(excludeId && { id: { not: excludeId } }) },
      });
      if (!exists) break;
      slug = `${base}-${counter++}`;
    }
    return slug;
  }

   
  private toResponseDto(trail: {
    id: string; title: string; slug: string; description: string;
    coverImageUrl: string | null; active: boolean; createdAt: Date;
    courses: Array<{ course?: { estimatedDurationMinutes: number } }>;
  }): TrailResponseDto {
    const totalDurationMinutes = trail.courses.reduce(
      (sum, tc) => sum + (tc.course?.estimatedDurationMinutes ?? 0),
      0,
    );
    return {
      id: trail.id,
      title: trail.title,
      slug: trail.slug,
      description: trail.description,
      coverImageUrl: trail.coverImageUrl,
      active: trail.active,
      courseCount: trail.courses.length,
      totalDurationMinutes,
      createdAt: trail.createdAt,
    };
  }

   
  private toStudentDto(
    trail: {
      id: string; title: string; slug: string; description: string;
      coverImageUrl: string | null; courses: Array<{ courseId: string; order: number; course: { id: string; title: string; estimatedDurationMinutes: number } }>;
    },
    completedSet: Set<string>,
  ): StudentTrailDto {
    const sorted = [...trail.courses].sort((a, b) => a.order - b.order);
    const completedCourses = sorted.filter((tc) => completedSet.has(tc.courseId)).length;
    const total = sorted.length;
    const nextCourse = sorted.find((tc) => !completedSet.has(tc.courseId));
    const totalDurationMinutes = sorted.reduce((s, tc) => s + tc.course.estimatedDurationMinutes, 0);

    return {
      id: trail.id,
      title: trail.title,
      slug: trail.slug,
      description: trail.description,
      coverImageUrl: trail.coverImageUrl,
      courseCount: total,
      completedCourses,
      progressPercentage: total > 0 ? Math.round((completedCourses / total) * 100) : 0,
      nextCourseId: nextCourse?.courseId ?? null,
      nextCourseTitle: nextCourse?.course.title ?? null,
      totalDurationMinutes,
    };
  }
}
