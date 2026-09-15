import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Course, CourseModule, Lesson } from '@prisma/client';
import { CourseStatus, CourseAssignmentType, LessonType, UserRole } from '@compliance/shared';
import { extractYouTubeVideoId, buildYouTubeEmbedUrl, slugify } from '@compliance/shared';
import type { JwtPayload, PaginatedResponse } from '@compliance/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCourseDto } from './dto/create-course.dto';
import type { UpdateCourseDto } from './dto/update-course.dto';
import type { ListCoursesQueryDto } from './dto/list-courses-query.dto';
import type {
  CourseResponseDto,
  CourseDetailResponseDto,
  CourseStoreAccessResponseDto,
  LessonResponseDto,
  ModuleResponseDto,
  PublishValidationResponseDto,
} from './dto/course-response.dto';
import type { CreateModuleDto, UpdateModuleDto, ReorderModulesDto } from './dto/module.dto';
import type { CreateLessonDto, UpdateLessonDto, ReorderLessonsDto } from './dto/lesson.dto';
import type { SetStoreAccessDto } from './dto/store-access.dto';

// ─── State machine ────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Partial<Record<string, CourseStatus[]>> = {
  [CourseStatus.DRAFT]: [CourseStatus.PUBLISHED, CourseStatus.ARCHIVED],
  [CourseStatus.PUBLISHED]: [CourseStatus.ARCHIVED],
  [CourseStatus.ARCHIVED]: [],
};

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Courses ─────────────────────────────────────────────────────────────────

  async findAll(
    requester: JwtPayload,
    query: ListCoursesQueryDto,
  ): Promise<PaginatedResponse<CourseResponseDto>> {
    const { page = 1, limit = 20, search, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {
      deletedAt: null,
      ...(requester.role === UserRole.MASTER_ADMIN
        ? // MA sees all courses filtered by status if provided
          { ...(status ? { status } : {}) }
        : // STORE_ADMIN sees only PUBLISHED courses available for their store
          {
            status: CourseStatus.PUBLISHED,
            storeAccess: {
              some: {
                storeId: requester.storeId ?? '',
                active: true,
                OR: [
                  { availableFrom: null },
                  { availableFrom: { lte: new Date() } },
                ],
                AND: [
                  { OR: [{ availableUntil: null }, { availableUntil: { gte: new Date() } }] },
                ],
              },
            },
          }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              modules: true,
            },
          },
          modules: {
            select: {
              _count: { select: { lessons: true } },
            },
          },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data: data.map((c) => this.toCourseDto(c)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, requester: JwtPayload): Promise<CourseDetailResponseDto> {
    const course = await this.prisma.course.findFirst({
      where: { id, deletedAt: null },
      include: {
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
          },
        },
        storeAccess: {
          include: {
            store: { select: { name: true, code: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { modules: true } },
      },
    });

    if (!course) throw new NotFoundException(`Curso '${id}' não encontrado`);

    // STORE_ADMIN can only see PUBLISHED courses available for their store
    if (requester.role !== UserRole.MASTER_ADMIN) {
      if (course.status !== CourseStatus.PUBLISHED) {
        throw new NotFoundException(`Curso '${id}' não encontrado`);
      }
      const hasAccess = course.storeAccess.some(
        (a) =>
          a.storeId === requester.storeId &&
          a.active &&
          (!a.availableFrom || a.availableFrom <= new Date()) &&
          (!a.availableUntil || a.availableUntil >= new Date()),
      );
      if (!hasAccess) throw new NotFoundException(`Curso '${id}' não encontrado`);
    }

    const lessonCount = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);

    return {
      ...this.toCourseDto({ ...course, lessonCount }),
      modules: course.modules.map((m) => this.toModuleDto(m)),
      storeAccess: course.storeAccess.map((a) => ({
        id: a.id,
        storeId: a.storeId,
        storeName: a.store.name,
        storeCode: a.store.code,
        assignmentType: a.assignmentType,
        availableFrom: a.availableFrom,
        availableUntil: a.availableUntil,
        active: a.active,
      })),
    };
  }

  async create(dto: CreateCourseDto, requester: JwtPayload): Promise<CourseResponseDto> {
    this.assertMasterAdmin(requester);

    const slug = await this.generateUniqueSlug(dto.title);

    const course = await this.prisma.course.create({
      data: {
        title: dto.title,
        slug,
        shortDescription: dto.shortDescription,
        description: dto.description,
        estimatedDurationMinutes: dto.estimatedDurationMinutes,
        minimumPassingScore: dto.minimumPassingScore ?? null,
        maximumAttempts: dto.maximumAttempts ?? null,
        certificateEnabled: dto.certificateEnabled ?? false,
        status: CourseStatus.DRAFT,
        createdById: requester.sub,
      },
      include: { _count: { select: { modules: true } }, modules: true },
    });

    await this.writeAuditLog(requester.sub, 'COURSE_CREATED', course.id, undefined, {
      title: course.title,
      slug: course.slug,
    });

    this.logger.log(`Course created: "${course.title}" (${course.id}) by ${requester.sub}`);
    return this.toCourseDto(course);
  }

  async update(id: string, dto: UpdateCourseDto, requester: JwtPayload): Promise<CourseResponseDto> {
    this.assertMasterAdmin(requester);

    const course = await this.findCourseOrThrow(id);

    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException('Cursos arquivados não podem ser editados');
    }

    let slug = course.slug;
    if (dto.title && dto.title !== course.title) {
      slug = await this.generateUniqueSlug(dto.title, id);
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title, slug }),
        ...(dto.shortDescription !== undefined && { shortDescription: dto.shortDescription }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.estimatedDurationMinutes !== undefined && {
          estimatedDurationMinutes: dto.estimatedDurationMinutes,
        }),
        ...(dto.minimumPassingScore !== undefined && {
          minimumPassingScore: dto.minimumPassingScore,
        }),
        ...(dto.maximumAttempts !== undefined && { maximumAttempts: dto.maximumAttempts }),
        ...(dto.certificateEnabled !== undefined && { certificateEnabled: dto.certificateEnabled }),
      },
      include: { _count: { select: { modules: true } }, modules: true },
    });

    await this.writeAuditLog(requester.sub, 'COURSE_UPDATED', id, { title: course.title }, {
      title: dto.title,
    });

    return this.toCourseDto(updated);
  }

  async softDelete(id: string, requester: JwtPayload): Promise<void> {
    this.assertMasterAdmin(requester);
    await this.findCourseOrThrow(id);

    await this.prisma.course.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.writeAuditLog(requester.sub, 'COURSE_DELETED', id);
    this.logger.log(`Course soft-deleted: ${id} by ${requester.sub}`);
  }

  async validateForPublish(id: string): Promise<PublishValidationResponseDto> {
    const course = await this.prisma.course.findFirst({
      where: { id, deletedAt: null },
      include: {
        modules: {
          include: {
            lessons: { where: { required: true } },
          },
        },
        storeAccess: { where: { active: true } },
        quiz: true,
      },
    });

    if (!course) throw new NotFoundException(`Curso '${id}' não encontrado`);

    const errors: string[] = [];

    if (!course.title?.trim()) errors.push('Título é obrigatório');
    if (!course.shortDescription?.trim()) errors.push('Descrição curta é obrigatória');
    if (!course.description?.trim()) errors.push('Descrição completa é obrigatória');
    if (!course.estimatedDurationMinutes || course.estimatedDurationMinutes <= 0) {
      errors.push('Duração estimada é obrigatória');
    }

    if (course.modules.length === 0) {
      errors.push('O curso deve ter pelo menos um módulo');
    } else {
      const requiredLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
      if (requiredLessons === 0) {
        errors.push('O curso deve ter pelo menos uma aula obrigatória');
      }
    }

    if (course.storeAccess.length === 0) {
      errors.push('O curso deve estar disponível para pelo menos uma loja');
    }

    if (course.quiz && course.minimumPassingScore === null) {
      errors.push('Nota mínima de aprovação é obrigatória quando o curso tem teste');
    }

    return { valid: errors.length === 0, errors };
  }

  async publish(id: string, requester: JwtPayload): Promise<CourseResponseDto> {
    this.assertMasterAdmin(requester);
    const course = await this.findCourseOrThrow(id);

    this.assertStatusTransition(course.status, CourseStatus.PUBLISHED);

    const validation = await this.validateForPublish(id);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Curso não pode ser publicado',
        errors: validation.errors,
      });
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.PUBLISHED, publishedAt: new Date() },
      include: { _count: { select: { modules: true } }, modules: true },
    });

    await this.writeAuditLog(requester.sub, 'COURSE_PUBLISHED', id, {
      status: CourseStatus.DRAFT,
    }, { status: CourseStatus.PUBLISHED });

    this.logger.log(`Course published: "${course.title}" (${id}) by ${requester.sub}`);
    return this.toCourseDto(updated);
  }

  async archive(id: string, requester: JwtPayload): Promise<CourseResponseDto> {
    this.assertMasterAdmin(requester);
    const course = await this.findCourseOrThrow(id);

    this.assertStatusTransition(course.status, CourseStatus.ARCHIVED);

    const updated = await this.prisma.course.update({
      where: { id },
      data: { status: CourseStatus.ARCHIVED },
      include: { _count: { select: { modules: true } }, modules: true },
    });

    await this.writeAuditLog(requester.sub, 'COURSE_ARCHIVED', id, {
      status: course.status,
    }, { status: CourseStatus.ARCHIVED });

    this.logger.log(`Course archived: "${course.title}" (${id}) by ${requester.sub}`);
    return this.toCourseDto(updated);
  }

  // ─── Modules ─────────────────────────────────────────────────────────────────

  async findModules(courseId: string, requester: JwtPayload): Promise<ModuleResponseDto[]> {
    await this.findCourseOrThrow(courseId, requester);

    const modules = await this.prisma.courseModule.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: { lessons: { orderBy: { order: 'asc' } } },
    });

    return modules.map((m) => this.toModuleDto(m));
  }

  async createModule(
    courseId: string,
    dto: CreateModuleDto,
    requester: JwtPayload,
  ): Promise<ModuleResponseDto> {
    this.assertMasterAdmin(requester);
    const course = await this.findCourseOrThrow(courseId);

    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException('Não é possível adicionar módulos a um curso arquivado');
    }

    const module = await this.prisma.courseModule.create({
      data: {
        courseId,
        title: dto.title,
        description: dto.description ?? null,
        order: dto.order,
      },
      include: { lessons: { orderBy: { order: 'asc' } } },
    });

    return this.toModuleDto(module);
  }

  async updateModule(
    courseId: string,
    moduleId: string,
    dto: UpdateModuleDto,
    requester: JwtPayload,
  ): Promise<ModuleResponseDto> {
    this.assertMasterAdmin(requester);
    await this.findCourseOrThrow(courseId);
    await this.findModuleOrThrow(moduleId, courseId);

    const updated = await this.prisma.courseModule.update({
      where: { id: moduleId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: { lessons: { orderBy: { order: 'asc' } } },
    });

    return this.toModuleDto(updated);
  }

  async deleteModule(courseId: string, moduleId: string, requester: JwtPayload): Promise<void> {
    this.assertMasterAdmin(requester);
    await this.findCourseOrThrow(courseId);
    await this.findModuleOrThrow(moduleId, courseId);

    await this.prisma.courseModule.delete({ where: { id: moduleId } });
  }

  async reorderModules(
    courseId: string,
    dto: ReorderModulesDto,
    requester: JwtPayload,
  ): Promise<void> {
    this.assertMasterAdmin(requester);
    await this.findCourseOrThrow(courseId);

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.courseModule.updateMany({
          where: { id, courseId },
          data: { order: index + 1 },
        }),
      ),
    );
  }

  // ─── Lessons ─────────────────────────────────────────────────────────────────

  async createLesson(
    courseId: string,
    moduleId: string,
    dto: CreateLessonDto,
    requester: JwtPayload,
  ): Promise<LessonResponseDto> {
    this.assertMasterAdmin(requester);
    const course = await this.findCourseOrThrow(courseId);

    if (course.status === CourseStatus.ARCHIVED) {
      throw new BadRequestException('Não é possível adicionar aulas a um curso arquivado');
    }

    await this.findModuleOrThrow(moduleId, courseId);

    const { youtubeVideoId, youtubeEmbedUrl } = this.processYouTubeUrl(dto.youtubeUrl, dto.type);

    const lesson = await this.prisma.lesson.create({
      data: {
        moduleId,
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type,
        order: dto.order,
        required: dto.required ?? true,
        durationMinutes: dto.durationMinutes ?? null,
        youtubeVideoId,
        youtubeEmbedUrl,
        textContent: dto.textContent ?? null,
      },
    });

    return this.toLessonDto(lesson);
  }

  async updateLesson(
    courseId: string,
    lessonId: string,
    dto: UpdateLessonDto,
    requester: JwtPayload,
  ): Promise<LessonResponseDto> {
    this.assertMasterAdmin(requester);
    await this.findCourseOrThrow(courseId);
    const lesson = await this.findLessonOrThrow(lessonId, courseId);

    const { youtubeVideoId, youtubeEmbedUrl } = dto.youtubeUrl !== undefined
      ? this.processYouTubeUrl(dto.youtubeUrl, lesson.type as LessonType)
      : { youtubeVideoId: lesson.youtubeVideoId, youtubeEmbedUrl: lesson.youtubeEmbedUrl };

    const updated = await this.prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.required !== undefined && { required: dto.required }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.textContent !== undefined && { textContent: dto.textContent }),
        youtubeVideoId,
        youtubeEmbedUrl,
      },
    });

    return this.toLessonDto(updated);
  }

  async deleteLesson(courseId: string, lessonId: string, requester: JwtPayload): Promise<void> {
    this.assertMasterAdmin(requester);
    await this.findCourseOrThrow(courseId);
    await this.findLessonOrThrow(lessonId, courseId);

    await this.prisma.lesson.delete({ where: { id: lessonId } });
  }

  async reorderLessons(
    courseId: string,
    dto: ReorderLessonsDto,
    requester: JwtPayload,
  ): Promise<void> {
    this.assertMasterAdmin(requester);
    await this.findCourseOrThrow(courseId);
    await this.findModuleOrThrow(dto.moduleId, courseId);

    await this.prisma.$transaction(
      dto.orderedIds.map((id, index) =>
        this.prisma.lesson.updateMany({
          where: { id, moduleId: dto.moduleId },
          data: { order: index + 1 },
        }),
      ),
    );
  }

  // ─── Store access ─────────────────────────────────────────────────────────────

  async findStoreAccess(courseId: string): Promise<CourseStoreAccessResponseDto[]> {
    await this.findCourseOrThrow(courseId);

    const accesses = await this.prisma.courseStoreAccess.findMany({
      where: { courseId },
      include: { store: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return accesses.map((a) => ({
      id: a.id,
      storeId: a.storeId,
      storeName: a.store.name,
      storeCode: a.store.code,
      assignmentType: a.assignmentType,
      availableFrom: a.availableFrom,
      availableUntil: a.availableUntil,
      active: a.active,
    }));
  }

  async setStoreAccess(
    courseId: string,
    dto: SetStoreAccessDto,
    requester: JwtPayload,
  ): Promise<CourseStoreAccessResponseDto[]> {
    this.assertMasterAdmin(requester);
    await this.findCourseOrThrow(courseId);

    const storeIds = dto.accesses.map((a) => a.storeId);

    await this.prisma.$transaction(async (tx) => {
      // Remove accesses not in the new list
      await tx.courseStoreAccess.deleteMany({
        where: { courseId, storeId: { notIn: storeIds } },
      });

      // Upsert each access
      for (const access of dto.accesses) {
        await tx.courseStoreAccess.upsert({
          where: { courseId_storeId: { courseId, storeId: access.storeId } },
          create: {
            courseId,
            storeId: access.storeId,
            assignmentType: access.assignmentType as CourseAssignmentType,
            availableFrom: access.availableFrom ? new Date(access.availableFrom) : null,
            availableUntil: access.availableUntil ? new Date(access.availableUntil) : null,
            active: access.active,
          },
          update: {
            assignmentType: access.assignmentType as CourseAssignmentType,
            availableFrom: access.availableFrom ? new Date(access.availableFrom) : null,
            availableUntil: access.availableUntil ? new Date(access.availableUntil) : null,
            active: access.active,
          },
        });
      }
    });

    await this.writeAuditLog(requester.sub, 'COURSE_STORE_ACCESS_UPDATED', courseId, undefined, {
      storeIds,
    });

    return this.findStoreAccess(courseId);
  }

  async removeStoreAccess(
    courseId: string,
    storeId: string,
    requester: JwtPayload,
  ): Promise<void> {
    this.assertMasterAdmin(requester);
    await this.findCourseOrThrow(courseId);

    const deleted = await this.prisma.courseStoreAccess.deleteMany({
      where: { courseId, storeId },
    });

    if (deleted.count === 0) {
      throw new NotFoundException(`Acesso da loja '${storeId}' não encontrado neste curso`);
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async findCourseOrThrow(id: string, requester?: JwtPayload): Promise<Course> {
    const course = await this.prisma.course.findFirst({
      where: { id, deletedAt: null },
    });

    if (!course) throw new NotFoundException(`Curso '${id}' não encontrado`);

    // STORE_ADMIN can only access published courses for their store
    if (requester && requester.role !== UserRole.MASTER_ADMIN) {
      if (course.status !== CourseStatus.PUBLISHED) {
        throw new NotFoundException(`Curso '${id}' não encontrado`);
      }
    }

    return course;
  }

  private async findModuleOrThrow(moduleId: string, courseId: string): Promise<CourseModule> {
    const module = await this.prisma.courseModule.findFirst({
      where: { id: moduleId, courseId },
    });
    if (!module) throw new NotFoundException(`Módulo '${moduleId}' não encontrado`);
    return module;
  }

  private async findLessonOrThrow(lessonId: string, courseId: string): Promise<Lesson> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, module: { courseId } },
    });
    if (!lesson) throw new NotFoundException(`Aula '${lessonId}' não encontrada`);
    return lesson;
  }

  private assertMasterAdmin(requester: JwtPayload): void {
    if (requester.role !== UserRole.MASTER_ADMIN) {
      throw new ForbiddenException('Somente MASTER_ADMIN pode realizar esta operação em cursos');
    }
  }

  private assertStatusTransition(from: string, to: CourseStatus): void {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Transição de status inválida: ${from} → ${to}. Transições permitidas a partir de ${from}: ${(VALID_TRANSITIONS[from] ?? []).join(', ') || 'nenhuma'}`,
      );
    }
  }

  private processYouTubeUrl(
    url: string | null | undefined,
    type: LessonType,
  ): { youtubeVideoId: string | null; youtubeEmbedUrl: string | null } {
    if (!url) return { youtubeVideoId: null, youtubeEmbedUrl: null };

    if (type !== LessonType.VIDEO) {
      throw new BadRequestException('URL do YouTube só é válida para aulas do tipo VIDEO');
    }

    const videoId = extractYouTubeVideoId(url);
    if (!videoId) {
      throw new BadRequestException(
        'URL do YouTube inválida. Formatos aceitos: https://youtube.com/watch?v=ID, https://youtu.be/ID, ou o ID direto (11 caracteres).',
      );
    }

    return {
      youtubeVideoId: videoId,
      youtubeEmbedUrl: buildYouTubeEmbedUrl(videoId),
    };
  }

  private async generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    const base = slugify(title);
    let slug = base;
    let counter = 1;

    for (;;) {
      const existing = await this.prisma.course.findFirst({
        where: {
          slug,
          deletedAt: null,
          ...(excludeId && { id: { not: excludeId } }),
        },
      });
      if (!existing) break;
      slug = `${base}-${counter++}`;
    }

    return slug;
  }

  private toCourseDto(
    course: Course & {
      _count?: { modules: number };
      modules?: Array<{ _count?: { lessons: number } } | CourseModule>;
      lessonCount?: number;
    },
  ): CourseResponseDto {
    const moduleCount = course._count?.modules ?? course.modules?.length ?? 0;
    const lessonCount =
      course.lessonCount ??
      (course.modules?.reduce(
        (sum, m) => sum + (('_count' in m ? m._count?.lessons : 0) ?? 0),
        0,
      ) ?? 0);

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      shortDescription: course.shortDescription,
      description: course.description,
      coverImageUrl: course.coverImageUrl,
      estimatedDurationMinutes: course.estimatedDurationMinutes,
      minimumPassingScore: course.minimumPassingScore,
      maximumAttempts: course.maximumAttempts,
      status: course.status as CourseStatus,
      certificateEnabled: course.certificateEnabled,
      publishedAt: course.publishedAt,
      createdById: course.createdById,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      moduleCount,
      lessonCount,
    };
  }

  private toModuleDto(
    module: CourseModule & { lessons: Lesson[] },
  ): ModuleResponseDto {
    return {
      id: module.id,
      courseId: module.courseId,
      title: module.title,
      description: module.description,
      order: module.order,
      lessons: module.lessons.map((l) => this.toLessonDto(l)),
      createdAt: module.createdAt,
      updatedAt: module.updatedAt,
    };
  }

  private toLessonDto(lesson: Lesson): LessonResponseDto {
    return {
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: lesson.title,
      description: lesson.description,
      type: lesson.type,
      order: lesson.order,
      required: lesson.required,
      durationMinutes: lesson.durationMinutes,
      youtubeVideoId: lesson.youtubeVideoId,
      youtubeEmbedUrl: lesson.youtubeEmbedUrl,
      textContent: lesson.textContent,
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt,
    };
  }

  private async writeAuditLog(
    actorUserId: string,
    action: string,
    entityId: string,
    previousData?: Record<string, unknown>,
    newData?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog
      .create({
        data: {
          actorUserId,
          action,
          entityType: 'Course',
          entityId,
          previousData: previousData as Prisma.InputJsonValue | undefined,
          newData: newData as Prisma.InputJsonValue | undefined,
        },
      })
      .catch((err: unknown) => this.logger.error('Audit log failed', err));
  }
}
