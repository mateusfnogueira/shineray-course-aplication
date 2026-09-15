import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { QuizAttempt, Enrollment } from '@prisma/client';
import { AttemptStatus, EnrollmentStatus } from '@compliance/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CertificatesService } from '../certificates/certificates.service';
import type {
  AttemptStateDto,
  AttemptResultDto,
  SaveAnswerDto,
  QuestionForAttemptDto,
  OptionForAttemptDto,
  SavedAnswerDto,
  QuestionResultDto,
  OptionResultDto,
} from './dto/attempt.dto';

@Injectable()
export class StudentQuizService {
  private readonly logger = new Logger(StudentQuizService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly certificatesService: CertificatesService,
  ) {}

  async startAttempt(enrollmentId: string, userId: string): Promise<AttemptStateDto> {
    const enrollment = await this.findEnrollmentOrThrow(enrollmentId, userId);

    const quiz = await this.prisma.quiz.findFirst({
      where: { courseId: enrollment.courseId, active: true },
    });
    if (!quiz) throw new NotFoundException('Este curso não possui teste ativo');

    // Verify all required lessons are completed
    await this.assertLessonsCompleted(enrollmentId, enrollment.courseId);

    // Return existing IN_PROGRESS attempt (resume)
    const existingAttempt = await this.prisma.quizAttempt.findFirst({
      where: { enrollmentId, quizId: quiz.id, status: AttemptStatus.IN_PROGRESS },
    });
    if (existingAttempt) {
      return this.buildAttemptState(existingAttempt, quiz.id, userId);
    }

    // Enforce attempt limit
    const attemptsUsed = await this.prisma.quizAttempt.count({
      where: { enrollmentId, quizId: quiz.id, status: { not: AttemptStatus.IN_PROGRESS } },
    });
    if (quiz.maximumAttempts !== null && attemptsUsed >= quiz.maximumAttempts) {
      throw new BadRequestException(
        `Limite de tentativas atingido (${quiz.maximumAttempts}/${quiz.maximumAttempts})`,
      );
    }

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        quizId: quiz.id,
        enrollmentId,
        attemptNumber: attemptsUsed + 1,
        status: AttemptStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
    });

    return this.buildAttemptState(attempt, quiz.id, userId);
  }

  async getAttempt(attemptId: string, userId: string): Promise<AttemptStateDto> {
    const attempt = await this.findAttemptOrThrow(attemptId, userId);

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Esta tentativa já foi concluída. Use /result para ver o resultado.');
    }

    return this.buildAttemptState(attempt, attempt.quizId, userId);
  }

  async saveAnswer(attemptId: string, userId: string, dto: SaveAnswerDto): Promise<void> {
    const attempt = await this.findAttemptOrThrow(attemptId, userId);

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Esta tentativa já foi concluída');
    }

    // Validate options belong to the question
    if (dto.selectedOptionIds.length > 0) {
      const validOptions = await this.prisma.questionOption.findMany({
        where: { id: { in: dto.selectedOptionIds }, questionId: dto.questionId },
        select: { id: true },
      });
      if (validOptions.length !== dto.selectedOptionIds.length) {
        throw new BadRequestException('Opções inválidas para esta questão');
      }
    }

    // Replace existing answer for this question (delete then create for many-to-many)
    await this.prisma.$transaction([
      this.prisma.quizAnswer.deleteMany({
        where: { quizAttemptId: attemptId, questionId: dto.questionId },
      }),
      this.prisma.quizAnswer.create({
        data: {
          quizAttemptId: attemptId,
          questionId: dto.questionId,
          selectedOptions: {
            connect: dto.selectedOptionIds.map((id) => ({ id })),
          },
        },
      }),
    ]);
  }

  async submitAttempt(attemptId: string, userId: string): Promise<AttemptResultDto> {
    const attempt = await this.findAttemptOrThrow(attemptId, userId);

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Esta tentativa já foi submetida');
    }

    // Load quiz with all questions and correct options
    const quiz = await this.prisma.quiz.findFirstOrThrow({
      where: { id: attempt.quizId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });

    // Load all student answers for this attempt
    const answers = await this.prisma.quizAnswer.findMany({
      where: { quizAttemptId: attemptId },
      include: { selectedOptions: { select: { id: true } } },
    });

    const answerMap = new Map(answers.map((a) => [a.questionId, a.selectedOptions.map((o) => o.id)]));

    // Calculate score (server-side — never trust client)
    let correctCount = 0;
    const questionCorrectness = new Map<string, boolean>();

    for (const question of quiz.questions) {
      const selectedIds = answerMap.get(question.id) ?? [];
      const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
      const correct = this.isQuestionCorrect(selectedIds, correctIds);
      questionCorrectness.set(question.id, correct);
      if (correct) correctCount++;
    }

    const score = quiz.questions.length > 0
      ? Math.round((correctCount / quiz.questions.length) * 100)
      : 0;

    const passed = score >= quiz.minimumPassingScore;
    const status = passed ? AttemptStatus.PASSED : AttemptStatus.FAILED;

    // Persist results and update answers atomically
    await this.prisma.$transaction([
      ...Array.from(questionCorrectness.entries()).map(([questionId, correct]) =>
        this.prisma.quizAnswer.updateMany({
          where: { quizAttemptId: attemptId, questionId },
          data: { correct },
        }),
      ),
      this.prisma.quizAttempt.update({
        where: { id: attemptId },
        data: { status, score, passed, submittedAt: new Date() },
      }),
    ]);

    if (passed) {
      await this.handlePassedQuiz(attempt.enrollmentId, attempt.quiz?.courseId ?? '');
    }

    this.logger.log(`Quiz attempt ${attemptId} submitted: score=${score}% passed=${passed}`);

    return this.buildResult(attemptId, attempt.attemptNumber, quiz, answerMap, questionCorrectness, score, passed, status, attempt.enrollmentId);
  }

  async getResult(attemptId: string, userId: string): Promise<AttemptResultDto> {
    const attempt = await this.findAttemptOrThrow(attemptId, userId);

    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Esta tentativa ainda não foi submetida');
    }

    const quiz = await this.prisma.quiz.findFirstOrThrow({
      where: { id: attempt.quizId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });

    const answers = await this.prisma.quizAnswer.findMany({
      where: { quizAttemptId: attemptId },
      include: { selectedOptions: { select: { id: true } } },
    });

    const answerMap = new Map(answers.map((a) => [a.questionId, a.selectedOptions.map((o) => o.id)]));
    const correctnessMap = new Map(answers.map((a) => [a.questionId, a.correct ?? false]));

    return this.buildResult(
      attemptId,
      attempt.attemptNumber,
      quiz,
      answerMap,
      correctnessMap,
      Number(attempt.score ?? 0),
      attempt.passed ?? false,
      attempt.status as AttemptStatus,
      attempt.enrollmentId,
    );
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private isQuestionCorrect(selectedIds: string[], correctIds: string[]): boolean {
    if (selectedIds.length === 0) return false;
    if (selectedIds.length !== correctIds.length) return false;
    const correctSet = new Set(correctIds);
    return selectedIds.every((id) => correctSet.has(id));
  }

  private shuffle<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private async assertLessonsCompleted(enrollmentId: string, courseId: string): Promise<void> {
    const [required, completed] = await this.prisma.$transaction([
      this.prisma.lesson.count({ where: { required: true, module: { courseId } } }),
      this.prisma.lessonProgress.count({
        where: {
          enrollmentId,
          completedAt: { not: null },
          lesson: { required: true, module: { courseId } },
        },
      }),
    ]);

    if (completed < required) {
      throw new BadRequestException(
        `Conclua todas as aulas obrigatórias antes de iniciar o teste (${completed}/${required} concluídas)`,
      );
    }
  }

  private async handlePassedQuiz(enrollmentId: string, courseId: string): Promise<void> {
    const enrollment = await this.prisma.enrollment.findFirst({ where: { id: enrollmentId } });
    if (!enrollment || enrollment.status === EnrollmentStatus.COMPLETED) return;

    const [required, completed] = await this.prisma.$transaction([
      this.prisma.lesson.count({ where: { required: true, module: { courseId } } }),
      this.prisma.lessonProgress.count({
        where: {
          enrollmentId,
          completedAt: { not: null },
          lesson: { required: true, module: { courseId } },
        },
      }),
    ]);

    if (completed >= required) {
      await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status: EnrollmentStatus.COMPLETED, completedAt: new Date() },
      });

      // Non-blocking certificate generation
      this.certificatesService.generateForEnrollment(enrollmentId).catch((err: unknown) =>
        this.logger.error(`Certificate generation failed for enrollment ${enrollmentId}`, err),
      );

      this.logger.log(`Enrollment ${enrollmentId} completed via quiz pass`);
    }
  }

  private async findEnrollmentOrThrow(enrollmentId: string, userId: string): Promise<Enrollment> {
    const enrollment = await this.prisma.enrollment.findFirst({ where: { id: enrollmentId, userId } });
    if (!enrollment) throw new NotFoundException('Matrícula não encontrada');
    return enrollment;
  }

  private async findAttemptOrThrow(
    attemptId: string,
    userId: string,
  ): Promise<QuizAttempt & { quiz?: { courseId: string } | null }> {
    const attempt = await this.prisma.quizAttempt.findFirst({
      where: { id: attemptId, enrollment: { userId } },
      include: { quiz: { select: { courseId: true } } },
    });
    if (!attempt) throw new NotFoundException('Tentativa não encontrada');
    return attempt;
  }

  private async buildAttemptState(
    attempt: QuizAttempt,
    quizId: string,
    _userId: string,
  ): Promise<AttemptStateDto> {
    const quiz = await this.prisma.quiz.findFirstOrThrow({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            // Never include isCorrect here — fetching only the safe fields
            options: { orderBy: { order: 'asc' }, select: { id: true, text: true, order: true } },
          },
        },
      },
    });

    const savedAnswers = await this.prisma.quizAnswer.findMany({
      where: { quizAttemptId: attempt.id },
      include: { selectedOptions: { select: { id: true } } },
    });

    const savedAnswerMap = new Map(
      savedAnswers.map((a) => [a.questionId, a.selectedOptions.map((o) => o.id)]),
    );

    const attemptsUsed = await this.prisma.quizAttempt.count({
      where: {
        enrollmentId: attempt.enrollmentId,
        quizId,
        status: { not: AttemptStatus.IN_PROGRESS },
      },
    });

    let questions: QuestionForAttemptDto[] = quiz.questions.map((q) => ({
      id: q.id,
      statement: q.statement,
      type: q.type,
      order: q.order,
      options: q.options.map((o): OptionForAttemptDto => ({ id: o.id, text: o.text, order: o.order })),
    }));

    if (quiz.shuffleQuestions) questions = this.shuffle(questions);
    if (quiz.shuffleAnswers) {
      questions = questions.map((q) => ({ ...q, options: this.shuffle(q.options) }));
    }

    const savedAnswersList: SavedAnswerDto[] = Array.from(savedAnswerMap.entries()).map(
      ([questionId, selectedOptionIds]) => ({ questionId, selectedOptionIds }),
    );

    return {
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      quizTitle: quiz.title,
      minimumPassingScore: quiz.minimumPassingScore,
      maximumAttempts: quiz.maximumAttempts,
      attemptsUsed: attemptsUsed + 1,
      totalQuestions: questions.length,
      questions,
      savedAnswers: savedAnswersList,
    };
  }

  private async buildResult(
    attemptId: string,
    attemptNumber: number,
    quiz: {
      minimumPassingScore: number;
      maximumAttempts: number | null;
      questions: Array<{
        id: string;
        statement: string;
        type: string;
        explanation: string | null;
        options: Array<{ id: string; text: string; isCorrect: boolean; order: number }>;
      }>;
    },
    answerMap: Map<string, string[]>,
    correctnessMap: Map<string, boolean>,
    score: number,
    passed: boolean,
    status: AttemptStatus,
    enrollmentId: string,
  ): Promise<AttemptResultDto> {
    const attemptsUsed = await this.prisma.quizAttempt.count({
      where: { enrollmentId, quizId: (await this.prisma.quizAttempt.findFirstOrThrow({ where: { id: attemptId }, select: { quizId: true } })).quizId },
    });

    const canRetry =
      status === AttemptStatus.FAILED &&
      (quiz.maximumAttempts === null || attemptsUsed < quiz.maximumAttempts);

    const attempt = await this.prisma.quizAttempt.findFirstOrThrow({
      where: { id: attemptId },
      select: { submittedAt: true },
    });

    const questions: QuestionResultDto[] = quiz.questions.map((q) => {
      const selected = new Set(answerMap.get(q.id) ?? []);
      return {
        id: q.id,
        statement: q.statement,
        type: q.type,
        correct: correctnessMap.get(q.id) ?? false,
        explanation: q.explanation,
        options: q.options.map((o): OptionResultDto => ({
          id: o.id,
          text: o.text,
          order: o.order,
          isCorrect: o.isCorrect, // now revealed post-submission
          wasSelected: selected.has(o.id),
        })),
      };
    });

    return {
      attemptId,
      attemptNumber,
      status,
      score,
      passed,
      submittedAt: attempt.submittedAt!,
      minimumPassingScore: quiz.minimumPassingScore,
      maximumAttempts: quiz.maximumAttempts,
      attemptsUsed,
      canRetry,
      questions,
    };
  }
}
