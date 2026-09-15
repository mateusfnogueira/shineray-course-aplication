import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserRole } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  QuizAdminDto,
  QuestionAdminDto,
} from './dto/admin-quiz.dto';

@Injectable()
export class QuizzesService {
  private readonly logger = new Logger(QuizzesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getQuiz(courseId: string): Promise<QuizAdminDto | null> {
    const quiz = await this.prisma.quiz.findFirst({
      where: { courseId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!quiz) return null;

    return this.toQuizAdminDto(quiz);
  }

  async createQuiz(courseId: string, dto: CreateQuizDto, actorId: string): Promise<QuizAdminDto> {
    const course = await this.prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
    if (!course) throw new NotFoundException(`Curso '${courseId}' não encontrado`);

    const existing = await this.prisma.quiz.findFirst({ where: { courseId } });
    if (existing) throw new ConflictException('Este curso já possui um teste');

    const quiz = await this.prisma.quiz.create({
      data: {
        courseId,
        title: dto.title,
        description: dto.description ?? null,
        minimumPassingScore: dto.minimumPassingScore,
        maximumAttempts: dto.maximumAttempts ?? null,
        shuffleQuestions: dto.shuffleQuestions ?? false,
        shuffleAnswers: dto.shuffleAnswers ?? false,
      },
      include: { questions: { include: { options: true } } },
    });

    await this.writeAuditLog(actorId, 'QUIZ_CREATED', courseId, undefined, { quizId: quiz.id });
    this.logger.log(`Quiz created for course ${courseId}`);
    return this.toQuizAdminDto(quiz);
  }

  async updateQuiz(quizId: string, dto: UpdateQuizDto, actorId: string): Promise<QuizAdminDto> {
    await this.findQuizOrThrow(quizId);

    const quiz = await this.prisma.quiz.update({
      where: { id: quizId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.minimumPassingScore !== undefined && { minimumPassingScore: dto.minimumPassingScore }),
        ...(dto.maximumAttempts !== undefined && { maximumAttempts: dto.maximumAttempts }),
        ...(dto.shuffleQuestions !== undefined && { shuffleQuestions: dto.shuffleQuestions }),
        ...(dto.shuffleAnswers !== undefined && { shuffleAnswers: dto.shuffleAnswers }),
        ...(dto.active !== undefined && { active: dto.active }),
      },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });

    await this.writeAuditLog(actorId, 'QUIZ_UPDATED', quizId, undefined, dto as Record<string, unknown>);
    return this.toQuizAdminDto(quiz);
  }

  async createQuestion(quizId: string, dto: CreateQuestionDto): Promise<QuestionAdminDto> {
    await this.findQuizOrThrow(quizId);

    const question = await this.prisma.question.create({
      data: {
        quizId,
        statement: dto.statement,
        type: dto.type,
        explanation: dto.explanation ?? null,
        order: dto.order,
        options: {
          create: dto.options.map((o) => ({
            text: o.text,
            isCorrect: o.isCorrect,
            order: o.order,
          })),
        },
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    return this.toQuestionAdminDto(question);
  }

  async updateQuestion(questionId: string, dto: UpdateQuestionDto): Promise<QuestionAdminDto> {
    const question = await this.prisma.question.findFirst({ where: { id: questionId } });
    if (!question) throw new NotFoundException(`Questão '${questionId}' não encontrada`);

    const updated = await this.prisma.question.update({
      where: { id: questionId },
      data: {
        ...(dto.statement !== undefined && { statement: dto.statement }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.explanation !== undefined && { explanation: dto.explanation }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.options && {
          options: {
            deleteMany: {},
            create: dto.options.map((o) => ({
              text: o.text,
              isCorrect: o.isCorrect,
              order: o.order,
            })),
          },
        }),
      },
      include: { options: { orderBy: { order: 'asc' } } },
    });

    return this.toQuestionAdminDto(updated);
  }

  async deleteQuestion(questionId: string): Promise<void> {
    const question = await this.prisma.question.findFirst({ where: { id: questionId } });
    if (!question) throw new NotFoundException(`Questão '${questionId}' não encontrada`);

    await this.prisma.question.delete({ where: { id: questionId } });
  }

  // ─── Access control helper ────────────────────────────────────────────────

  assertMasterAdmin(requester: JwtPayload): void {
    if (requester.role !== UserRole.MASTER_ADMIN) {
      throw new NotFoundException('Recurso não encontrado');
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private async findQuizOrThrow(quizId: string) {
    const quiz = await this.prisma.quiz.findFirst({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException(`Teste '${quizId}' não encontrado`);
    return quiz;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private toQuizAdminDto(quiz: Awaited<ReturnType<typeof this.prisma.quiz.findFirst<{
    include: {
      questions: { include: { options: { orderBy: { order: 'asc' } } }; orderBy: { order: 'asc' } };
    };
  }>>>) {
    if (!quiz) throw new NotFoundException('Teste não encontrado');
    return {
      id: quiz.id,
      courseId: quiz.courseId,
      title: quiz.title,
      description: quiz.description,
      minimumPassingScore: quiz.minimumPassingScore,
      maximumAttempts: quiz.maximumAttempts,
      shuffleQuestions: quiz.shuffleQuestions,
      shuffleAnswers: quiz.shuffleAnswers,
      active: quiz.active,
      questionCount: quiz.questions.length,
      questions: quiz.questions.map((q) => this.toQuestionAdminDto(q)),
    } satisfies QuizAdminDto;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  private toQuestionAdminDto(q: { id: string; quizId: string; statement: string; type: string; explanation: string | null; order: number; options: Array<{ id: string; text: string; isCorrect: boolean; order: number }> }) {
    return {
      id: q.id,
      quizId: q.quizId,
      statement: q.statement,
      type: q.type,
      explanation: q.explanation,
      order: q.order,
      options: q.options.map((o) => ({
        id: o.id,
        text: o.text,
        isCorrect: o.isCorrect,
        order: o.order,
      })),
    } satisfies QuestionAdminDto;
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
          entityType: 'Quiz',
          entityId,
          previousData: previousData as Prisma.InputJsonValue | undefined,
          newData: newData as Prisma.InputJsonValue | undefined,
        },
      })
      .catch((err: unknown) => this.logger.error('Audit log failed', err));
  }
}
