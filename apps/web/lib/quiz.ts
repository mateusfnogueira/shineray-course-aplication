const API_BASE = `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/v1`;

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : '';
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Erro' }));
    throw new Error((body as { message?: string }).message ?? 'Erro na requisição');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Admin types ────────────────────────────────────────────────────────────

export interface OptionAdminDto { id: string; text: string; isCorrect: boolean; order: number }
export interface QuestionAdminDto {
  id: string; quizId: string; statement: string; type: string;
  explanation: string | null; order: number; options: OptionAdminDto[];
}
export interface QuizAdminDto {
  id: string; courseId: string; title: string; description: string | null;
  minimumPassingScore: number; maximumAttempts: number | null;
  shuffleQuestions: boolean; shuffleAnswers: boolean; active: boolean;
  questionCount: number; questions: QuestionAdminDto[];
}
export interface CreateQuizInput {
  title: string; description?: string; minimumPassingScore: number;
  maximumAttempts?: number | null; shuffleQuestions?: boolean; shuffleAnswers?: boolean;
}
export interface CreateQuestionInput {
  statement: string; type: string; explanation?: string; order: number;
  options: Array<{ text: string; isCorrect: boolean; order: number }>;
}

// ─── Student attempt types ──────────────────────────────────────────────────

export interface OptionForAttempt { id: string; text: string; order: number }
export interface QuestionForAttempt {
  id: string; statement: string; type: string; order: number; options: OptionForAttempt[];
}
export interface AttemptStateDto {
  attemptId: string; attemptNumber: number; quizTitle: string;
  minimumPassingScore: number; maximumAttempts: number | null;
  attemptsUsed: number; totalQuestions: number;
  questions: QuestionForAttempt[];
  savedAnswers: Array<{ questionId: string; selectedOptionIds: string[] }>;
}
export interface OptionResultDto {
  id: string; text: string; order: number; isCorrect: boolean; wasSelected: boolean;
}
export interface QuestionResultDto {
  id: string; statement: string; type: string; correct: boolean;
  explanation: string | null; options: OptionResultDto[];
}
export interface AttemptResultDto {
  attemptId: string; attemptNumber: number; status: string; score: number;
  passed: boolean; submittedAt: string; minimumPassingScore: number;
  maximumAttempts: number | null; attemptsUsed: number; canRetry: boolean;
  questions: QuestionResultDto[];
}

// ─── Admin API ──────────────────────────────────────────────────────────────

export function getQuiz(courseId: string): Promise<QuizAdminDto | null> {
  return apiFetch<QuizAdminDto | null>(`/courses/${courseId}/quiz`);
}
export function createQuiz(courseId: string, data: CreateQuizInput): Promise<QuizAdminDto> {
  return apiFetch(`/courses/${courseId}/quiz`, { method: 'POST', body: JSON.stringify(data) });
}
export function updateQuiz(quizId: string, data: Partial<CreateQuizInput & { active: boolean }>): Promise<QuizAdminDto> {
  return apiFetch(`/quizzes/${quizId}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function createQuestion(quizId: string, data: CreateQuestionInput): Promise<QuestionAdminDto> {
  return apiFetch(`/quizzes/${quizId}/questions`, { method: 'POST', body: JSON.stringify(data) });
}
export function updateQuestion(questionId: string, data: Partial<CreateQuestionInput>): Promise<QuestionAdminDto> {
  return apiFetch(`/questions/${questionId}`, { method: 'PATCH', body: JSON.stringify(data) });
}
export function deleteQuestion(questionId: string): Promise<void> {
  return apiFetch(`/questions/${questionId}`, { method: 'DELETE' });
}

// ─── Student API ────────────────────────────────────────────────────────────

export function startQuizAttempt(enrollmentId: string): Promise<AttemptStateDto> {
  return apiFetch(`/student/enrollments/${enrollmentId}/quiz/start`, { method: 'POST' });
}
export function getQuizAttempt(attemptId: string): Promise<AttemptStateDto> {
  return apiFetch(`/student/quiz-attempts/${attemptId}`);
}
export function saveAnswer(
  attemptId: string,
  questionId: string,
  selectedOptionIds: string[],
): Promise<void> {
  return apiFetch(`/student/quiz-attempts/${attemptId}/answer`, {
    method: 'POST',
    body: JSON.stringify({ questionId, selectedOptionIds }),
  });
}
export function submitAttempt(attemptId: string): Promise<AttemptResultDto> {
  return apiFetch(`/student/quiz-attempts/${attemptId}/submit`, { method: 'POST' });
}
export function getAttemptResult(attemptId: string): Promise<AttemptResultDto> {
  return apiFetch(`/student/quiz-attempts/${attemptId}/result`);
}
