import type { EnrollmentStatus, CourseAssignmentType } from '@compliance/shared';

const API_BASE = `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/v1/student`;

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
    throw new Error((body as { message?: string }).message ?? 'Erro');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface EnrollmentSummaryDto {
  id: string;
  status: EnrollmentStatus;
  progressPercentage: number;
  startedAt: string | null;
  completedAt: string | null;
  lastAccessedAt: string | null;
}

export interface StudentCourseDto {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  coverImageUrl: string | null;
  estimatedDurationMinutes: number;
  minimumPassingScore: number | null;
  certificateEnabled: boolean;
  publishedAt: string;
  moduleCount: number;
  lessonCount: number;
  assignmentType: CourseAssignmentType;
  enrollment: EnrollmentSummaryDto | null;
  isFavorited: boolean;
}

export interface LessonProgressDto {
  startedAt: string | null;
  completedAt: string | null;
  watchedSeconds: number | null;
  lastPositionSeconds: number | null;
}

export interface LessonWithProgressDto {
  id: string;
  title: string;
  description: string | null;
  type: string;
  order: number;
  required: boolean;
  durationMinutes: number | null;
  youtubeVideoId: string | null;
  youtubeEmbedUrl: string | null;
  textContent: string | null;
  progress: LessonProgressDto | null;
}

export interface ModuleWithProgressDto {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: LessonWithProgressDto[];
}

export interface EnrollmentDetailDto {
  id: string;
  courseId: string;
  status: EnrollmentStatus;
  progressPercentage: number;
  startedAt: string | null;
  completedAt: string | null;
  lastAccessedAt: string | null;
  hasQuiz: boolean;
  modules: ModuleWithProgressDto[];
}

export interface CompleteLessonDto {
  progressPercentage: number;
  enrollmentCompleted: boolean;
  enrollmentStatus: EnrollmentStatus;
}

export interface StudentDashboardDto {
  userName: string;
  stats: {
    totalEnrollments: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    requiredPending: number;
    overallProgressPercentage: number;
  };
  requiredPending: StudentCourseDto[];
  inProgress: StudentCourseDto[];
  lastAccessedCourseId: string | null;
  lastAccessedEnrollmentId: string | null;
}

// ─── API functions ──────────────────────────────────────────────────────────

export function getDashboard(): Promise<StudentDashboardDto> {
  return apiFetch('/dashboard');
}

export function getCatalog(params?: { page?: number; limit?: number; search?: string }): Promise<{
  data: StudentCourseDto[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.search) q.set('search', params.search);
  return apiFetch(`/courses?${q.toString()}`);
}

export function getRequiredCourses(): Promise<StudentCourseDto[]> {
  return apiFetch('/courses/required');
}

export function getInProgressCourses(): Promise<StudentCourseDto[]> {
  return apiFetch('/courses/in-progress');
}

export function getCompletedCourses(): Promise<StudentCourseDto[]> {
  return apiFetch('/courses/completed');
}

export function getStudentCourse(courseId: string): Promise<StudentCourseDto> {
  return apiFetch(`/courses/${courseId}`);
}

export function startCourse(courseId: string): Promise<EnrollmentDetailDto> {
  return apiFetch(`/courses/${courseId}/start`, { method: 'POST' });
}

export function getEnrollment(enrollmentId: string): Promise<EnrollmentDetailDto> {
  return apiFetch(`/enrollments/${enrollmentId}`);
}

export function startLesson(enrollmentId: string, lessonId: string): Promise<void> {
  return apiFetch(`/enrollments/${enrollmentId}/lessons/${lessonId}/start`, { method: 'POST' });
}

export function updateLessonProgress(
  enrollmentId: string,
  lessonId: string,
  data: { watchedSeconds?: number; lastPositionSeconds?: number },
): Promise<void> {
  return apiFetch(`/enrollments/${enrollmentId}/lessons/${lessonId}/progress`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function completeLesson(enrollmentId: string, lessonId: string): Promise<CompleteLessonDto> {
  return apiFetch(`/enrollments/${enrollmentId}/lessons/${lessonId}/complete`, { method: 'POST' });
}

export function addFavorite(courseId: string): Promise<void> {
  return apiFetch(`/courses/${courseId}/favorite`, { method: 'POST' });
}

export function removeFavorite(courseId: string): Promise<void> {
  return apiFetch(`/courses/${courseId}/favorite`, { method: 'DELETE' });
}
