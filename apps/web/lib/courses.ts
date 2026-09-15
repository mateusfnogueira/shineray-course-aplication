import type { PaginatedResponse } from '@compliance/shared';
import { type CourseStatus } from '@compliance/shared';

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
    const body = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error((body as { message?: string }).message ?? 'Erro na requisição');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourseDto {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  coverImageUrl: string | null;
  estimatedDurationMinutes: number;
  minimumPassingScore: number | null;
  maximumAttempts: number | null;
  status: CourseStatus;
  certificateEnabled: boolean;
  publishedAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  moduleCount: number;
  lessonCount: number;
}

export interface LessonDto {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  type: string;
  order: number;
  required: boolean;
  durationMinutes: number | null;
  youtubeVideoId: string | null;
  youtubeEmbedUrl: string | null;
  textContent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleDto {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  order: number;
  lessons: LessonDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CourseStoreAccessDto {
  id: string;
  storeId: string;
  storeName: string;
  storeCode: string;
  assignmentType: string;
  availableFrom: string | null;
  availableUntil: string | null;
  active: boolean;
}

export interface CourseDetailDto extends CourseDto {
  modules: ModuleDto[];
  storeAccess: CourseStoreAccessDto[];
}

export interface PublishValidationDto {
  valid: boolean;
  errors: string[];
}

export interface CreateCourseInput {
  title: string;
  shortDescription: string;
  description: string;
  estimatedDurationMinutes: number;
  minimumPassingScore?: number | null;
  maximumAttempts?: number | null;
  certificateEnabled?: boolean;
}

export interface CreateModuleInput {
  title: string;
  description?: string | null;
  order: number;
}

export interface CreateLessonInput {
  title: string;
  description?: string | null;
  type: string;
  order: number;
  required?: boolean;
  durationMinutes?: number | null;
  youtubeUrl?: string | null;
  textContent?: string | null;
}

export interface StoreAccessItem {
  storeId: string;
  assignmentType: string;
  availableFrom?: string | null;
  availableUntil?: string | null;
  active: boolean;
}

// ─── API functions ────────────────────────────────────────────────────────────

export function listCourses(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: CourseStatus;
}): Promise<PaginatedResponse<CourseDto>> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.search) q.set('search', params.search);
  if (params?.status) q.set('status', params.status);
  return apiFetch(`/courses?${q.toString()}`);
}

export function getCourse(id: string): Promise<CourseDetailDto> {
  return apiFetch(`/courses/${id}`);
}

export function createCourse(data: CreateCourseInput): Promise<CourseDto> {
  return apiFetch('/courses', { method: 'POST', body: JSON.stringify(data) });
}

export function updateCourse(id: string, data: Partial<CreateCourseInput>): Promise<CourseDto> {
  return apiFetch(`/courses/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteCourse(id: string): Promise<void> {
  return apiFetch(`/courses/${id}`, { method: 'DELETE' });
}

export function validatePublish(id: string): Promise<PublishValidationDto> {
  return apiFetch(`/courses/${id}/validate-publish`);
}

export function publishCourse(id: string): Promise<CourseDto> {
  return apiFetch(`/courses/${id}/publish`, { method: 'POST' });
}

export function archiveCourse(id: string): Promise<CourseDto> {
  return apiFetch(`/courses/${id}/archive`, { method: 'POST' });
}

// Modules
export function createModule(courseId: string, data: CreateModuleInput): Promise<ModuleDto> {
  return apiFetch(`/courses/${courseId}/modules`, { method: 'POST', body: JSON.stringify(data) });
}

export function updateModule(courseId: string, moduleId: string, data: { title?: string; description?: string | null }): Promise<ModuleDto> {
  return apiFetch(`/courses/${courseId}/modules/${moduleId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteModule(courseId: string, moduleId: string): Promise<void> {
  return apiFetch(`/courses/${courseId}/modules/${moduleId}`, { method: 'DELETE' });
}

export function reorderModules(courseId: string, orderedIds: string[]): Promise<void> {
  return apiFetch(`/courses/${courseId}/modules/reorder`, { method: 'PATCH', body: JSON.stringify({ orderedIds }) });
}

// Lessons
export function createLesson(courseId: string, moduleId: string, data: CreateLessonInput): Promise<LessonDto> {
  return apiFetch(`/courses/${courseId}/modules/${moduleId}/lessons`, { method: 'POST', body: JSON.stringify(data) });
}

export function updateLesson(courseId: string, lessonId: string, data: Partial<CreateLessonInput>): Promise<LessonDto> {
  return apiFetch(`/courses/${courseId}/lessons/${lessonId}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteLesson(courseId: string, lessonId: string): Promise<void> {
  return apiFetch(`/courses/${courseId}/lessons/${lessonId}`, { method: 'DELETE' });
}

export function reorderLessons(courseId: string, moduleId: string, orderedIds: string[]): Promise<void> {
  return apiFetch(`/courses/${courseId}/lessons/reorder`, { method: 'PATCH', body: JSON.stringify({ moduleId, orderedIds }) });
}

// Store access
export function getStoreAccess(courseId: string): Promise<CourseStoreAccessDto[]> {
  return apiFetch(`/courses/${courseId}/store-access`);
}

export function setStoreAccess(courseId: string, accesses: StoreAccessItem[]): Promise<CourseStoreAccessDto[]> {
  return apiFetch(`/courses/${courseId}/store-access`, { method: 'PUT', body: JSON.stringify({ accesses }) });
}

export function removeStoreAccess(courseId: string, storeId: string): Promise<void> {
  return apiFetch(`/courses/${courseId}/store-access/${storeId}`, { method: 'DELETE' });
}
