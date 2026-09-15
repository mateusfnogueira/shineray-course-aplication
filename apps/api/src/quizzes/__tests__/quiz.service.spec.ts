import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StudentQuizService } from '../student-quiz.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CertificatesService } from '../../certificates/certificates.service';
import { AttemptStatus } from '@compliance/shared';

const mockEnrollment = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'enrollment-id',
  userId: 'student-id',
  courseId: 'course-id',
  status: 'IN_PROGRESS',
  progressPercentage: 100,
  startedAt: new Date(),
  completedAt: null,
  ...overrides,
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const mockQuiz = () => ({
  id: 'quiz-id',
  courseId: 'course-id',
  title: 'Teste Final',
  description: null,
  minimumPassingScore: 70,
  maximumAttempts: 3,
  shuffleQuestions: false,
  shuffleAnswers: false,
  active: true,
  questions: [
    {
      id: 'q1',
      quizId: 'quiz-id',
      statement: 'Qual é o objetivo do compliance?',
      type: 'SINGLE_CHOICE',
      explanation: 'Compliance garante conformidade.',
      order: 1,
      options: [
        { id: 'q1o1', text: 'Conformidade regulatória', isCorrect: true, order: 1 },
        { id: 'q1o2', text: 'Aumentar lucros', isCorrect: false, order: 2 },
        { id: 'q1o3', text: 'Reduzir funcionários', isCorrect: false, order: 3 },
      ],
    },
    {
      id: 'q2',
      quizId: 'quiz-id',
      statement: 'Ética nas vendas é importante?',
      type: 'TRUE_FALSE',
      explanation: null,
      order: 2,
      options: [
        { id: 'q2o1', text: 'Verdadeiro', isCorrect: true, order: 1 },
        { id: 'q2o2', text: 'Falso', isCorrect: false, order: 2 },
      ],
    },
  ],
});

const mockAttempt = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'attempt-id',
  quizId: 'quiz-id',
  enrollmentId: 'enrollment-id',
  attemptNumber: 1,
  status: AttemptStatus.IN_PROGRESS,
  score: null,
  passed: null,
  startedAt: new Date(),
  submittedAt: null,
  createdAt: new Date(),
  quiz: { courseId: 'course-id' },
  ...overrides,
});

const mockPrisma = {
  enrollment: { findFirst: jest.fn(), update: jest.fn() },
  quiz: {
    findFirst: jest.fn(),
    findFirstOrThrow: jest.fn(),
  },
  quizAttempt: {
    findFirst: jest.fn(),
    findFirstOrThrow: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  quizAnswer: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  questionOption: { findMany: jest.fn() },
  lesson: { count: jest.fn() },
  lessonProgress: { count: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
};

describe('StudentQuizService', () => {
  let service: StudentQuizService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        StudentQuizService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CertificatesService, useValue: { generateForEnrollment: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get(StudentQuizService);
    jest.clearAllMocks();
    mockPrisma.auditLog.create.mockResolvedValue({});
    mockPrisma.enrollment.update.mockResolvedValue({});
  });

  describe('startAttempt', () => {
    it('creates a new attempt when prerequisites are met', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(mockEnrollment());
      mockPrisma.quiz.findFirst.mockResolvedValue(mockQuiz());
      // All lessons completed
      mockPrisma.$transaction.mockResolvedValueOnce([1, 1]); // required=1, completed=1
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(null); // no existing attempt
      mockPrisma.quizAttempt.count.mockResolvedValue(0); // no previous attempts
      mockPrisma.quizAttempt.create.mockResolvedValue(mockAttempt());

      // buildAttemptState calls
      mockPrisma.quiz.findFirstOrThrow.mockResolvedValue({
        ...mockQuiz(),
        questions: mockQuiz().questions.map((q) => ({
          ...q,
          options: q.options.map(({ isCorrect: _ic, ...o }) => o), // no isCorrect
        })),
      });
      mockPrisma.quizAnswer.findMany.mockResolvedValue([]);
      mockPrisma.quizAttempt.count.mockResolvedValue(0);

      const result = await service.startAttempt('enrollment-id', 'student-id');

      expect(result.attemptId).toBe('attempt-id');
      expect(result.questions).toHaveLength(2);
      // isCorrect must NOT be present in any option
      result.questions.forEach((q) => {
        q.options.forEach((o) => {
          expect(o).not.toHaveProperty('isCorrect');
        });
      });
    });

    it('throws BadRequestException when lessons are not completed', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(mockEnrollment());
      mockPrisma.quiz.findFirst.mockResolvedValue(mockQuiz());
      mockPrisma.$transaction.mockResolvedValueOnce([3, 1]); // 3 required, only 1 done

      await expect(
        service.startAttempt('enrollment-id', 'student-id'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when attempt limit is reached', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(mockEnrollment());
      mockPrisma.quiz.findFirst.mockResolvedValue(mockQuiz()); // maximumAttempts: 3
      mockPrisma.$transaction.mockResolvedValueOnce([1, 1]);
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(null);
      mockPrisma.quizAttempt.count.mockResolvedValue(3); // all 3 attempts used

      await expect(
        service.startAttempt('enrollment-id', 'student-id'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('resumes an existing IN_PROGRESS attempt', async () => {
      mockPrisma.enrollment.findFirst.mockResolvedValue(mockEnrollment());
      mockPrisma.quiz.findFirst.mockResolvedValue(mockQuiz());
      mockPrisma.$transaction.mockResolvedValueOnce([1, 1]);
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(mockAttempt()); // existing
      mockPrisma.quiz.findFirstOrThrow.mockResolvedValue({
        ...mockQuiz(),
        questions: mockQuiz().questions.map((q) => ({
          ...q,
          options: q.options.map(({ isCorrect: _ic, ...o }) => o),
        })),
      });
      mockPrisma.quizAnswer.findMany.mockResolvedValue([]);
      mockPrisma.quizAttempt.count.mockResolvedValue(0);

      const result = await service.startAttempt('enrollment-id', 'student-id');

      expect(mockPrisma.quizAttempt.create).not.toHaveBeenCalled(); // no new attempt
      expect(result.attemptId).toBe('attempt-id');
    });
  });

  describe('submitAttempt — score calculation', () => {
    it('calculates score correctly and marks as PASSED', async () => {
      const quiz = mockQuiz();
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(mockAttempt());
      mockPrisma.quiz.findFirstOrThrow.mockResolvedValue(quiz);
      // Both questions answered correctly
      mockPrisma.quizAnswer.findMany.mockResolvedValue([
        { questionId: 'q1', selectedOptions: [{ id: 'q1o1' }] }, // correct
        { questionId: 'q2', selectedOptions: [{ id: 'q2o1' }] }, // correct
      ]);
      mockPrisma.$transaction.mockResolvedValue([{}, {}, {}]);
      // handlePassedQuiz
      mockPrisma.enrollment.findFirst.mockResolvedValue(mockEnrollment());
      mockPrisma.$transaction.mockResolvedValueOnce([1, 1]);
      mockPrisma.enrollment.findFirst.mockResolvedValue(mockEnrollment({ status: 'IN_PROGRESS' }));

      // buildResult
      mockPrisma.quizAttempt.count.mockResolvedValue(1);
      mockPrisma.quizAttempt.findFirstOrThrow.mockResolvedValue({
        quizId: 'quiz-id',
        submittedAt: new Date(),
      });

      const result = await service.submitAttempt('attempt-id', 'student-id');

      expect(result.score).toBe(100);
      expect(result.passed).toBe(true);
      expect(result.status).toBe(AttemptStatus.PASSED);
    });

    it('marks as FAILED when score is below minimum', async () => {
      const quiz = mockQuiz();
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(mockAttempt());
      mockPrisma.quiz.findFirstOrThrow.mockResolvedValue(quiz);
      // First question wrong, second correct → 50% < 70%
      mockPrisma.quizAnswer.findMany.mockResolvedValue([
        { questionId: 'q1', selectedOptions: [{ id: 'q1o2' }] }, // wrong
        { questionId: 'q2', selectedOptions: [{ id: 'q2o1' }] }, // correct
      ]);
      mockPrisma.$transaction.mockResolvedValue([{}, {}, {}]);
      mockPrisma.quizAttempt.count.mockResolvedValue(1);
      mockPrisma.quizAttempt.findFirstOrThrow.mockResolvedValue({
        quizId: 'quiz-id',
        submittedAt: new Date(),
      });

      const result = await service.submitAttempt('attempt-id', 'student-id');

      expect(result.score).toBe(50);
      expect(result.passed).toBe(false);
      expect(result.status).toBe(AttemptStatus.FAILED);
    });

    it('already submitted attempt cannot be submitted again', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(
        mockAttempt({ status: AttemptStatus.PASSED }),
      );

      await expect(
        service.submitAttempt('attempt-id', 'student-id'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('score is never accepted from client — computed server-side', async () => {
      // This test verifies the service calls the score calculation internally
      // regardless of any external input. The submit endpoint has no score param.
      const quiz = mockQuiz();
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(mockAttempt());
      mockPrisma.quiz.findFirstOrThrow.mockResolvedValue(quiz);
      mockPrisma.quizAnswer.findMany.mockResolvedValue([]); // no answers → score = 0
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);
      mockPrisma.quizAttempt.count.mockResolvedValue(1);
      mockPrisma.quizAttempt.findFirstOrThrow.mockResolvedValue({ quizId: 'quiz-id', submittedAt: new Date() });

      const result = await service.submitAttempt('attempt-id', 'student-id');

      expect(result.score).toBe(0); // 0 correct / 2 total = 0%
      expect(result.passed).toBe(false);
    });
  });

  describe('getResult — isCorrect revealed after submission', () => {
    it('exposes isCorrect in result options', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(
        mockAttempt({ status: AttemptStatus.PASSED }),
      );
      mockPrisma.quiz.findFirstOrThrow.mockResolvedValue(mockQuiz());
      mockPrisma.quizAnswer.findMany.mockResolvedValue([
        { questionId: 'q1', correct: true, selectedOptions: [{ id: 'q1o1' }] },
        { questionId: 'q2', correct: true, selectedOptions: [{ id: 'q2o1' }] },
      ]);
      mockPrisma.quizAttempt.count.mockResolvedValue(1);
      mockPrisma.quizAttempt.findFirstOrThrow.mockResolvedValue({ quizId: 'quiz-id', submittedAt: new Date() });

      const result = await service.getResult('attempt-id', 'student-id');

      // isCorrect IS present in result
      result.questions.forEach((q) => {
        q.options.forEach((o) => {
          expect(o).toHaveProperty('isCorrect');
        });
      });
    });

    it('throws BadRequestException when attempt is still IN_PROGRESS', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(
        mockAttempt({ status: AttemptStatus.IN_PROGRESS }),
      );

      await expect(service.getResult('attempt-id', 'student-id')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('ownership', () => {
    it('throws NotFoundException for attempt belonging to another user', async () => {
      mockPrisma.quizAttempt.findFirst.mockResolvedValue(null);

      await expect(
        service.submitAttempt('attempt-id', 'other-student-id'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
