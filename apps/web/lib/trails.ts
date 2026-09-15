const API_BASE = `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/v1`;

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : '';
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Erro' }));
    throw new Error((body as { message?: string }).message ?? 'Erro');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface TrailCourseDto {
  id: string; courseId: string; courseTitle: string; courseSlug: string;
  estimatedDurationMinutes: number; order: number; courseStatus: string;
}
export interface TrailDto {
  id: string; title: string; slug: string; description: string;
  coverImageUrl: string | null; active: boolean; courseCount: number;
  totalDurationMinutes: number; createdAt: string;
}
export interface TrailDetailDto extends TrailDto {
  courses: TrailCourseDto[];
}
export interface StudentTrailDto {
  id: string; title: string; slug: string; description: string;
  coverImageUrl: string | null; courseCount: number; completedCourses: number;
  progressPercentage: number; nextCourseId: string | null; nextCourseTitle: string | null;
  totalDurationMinutes: number;
}

// Admin
export const listTrails = () => apiFetch<TrailDto[]>('/trails');
export const getTrail = (id: string) => apiFetch<TrailDetailDto>(`/trails/${id}`);
export const createTrail = (data: { title: string; description: string; active?: boolean }) =>
  apiFetch<TrailDetailDto>('/trails', { method: 'POST', body: JSON.stringify(data) });
export const updateTrail = (id: string, data: Partial<{ title: string; description: string; active: boolean }>) =>
  apiFetch<TrailDetailDto>(`/trails/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteTrail = (id: string) => apiFetch<void>(`/trails/${id}`, { method: 'DELETE' });
export const addCourseToTrail = (trailId: string, courseId: string, order: number) =>
  apiFetch<TrailDetailDto>(`/trails/${trailId}/courses`, { method: 'POST', body: JSON.stringify({ courseId, order }) });
export const removeCourseFromTrail = (trailId: string, courseId: string) =>
  apiFetch<void>(`/trails/${trailId}/courses/${courseId}`, { method: 'DELETE' });
export const reorderTrailCourses = (trailId: string, orderedCourseIds: string[]) =>
  apiFetch<void>(`/trails/${trailId}/courses/reorder`, { method: 'PATCH', body: JSON.stringify({ orderedCourseIds }) });

// Student
export const listStudentTrails = () => apiFetch<StudentTrailDto[]>('/student/trails');
export const getStudentTrail = (id: string) => apiFetch<TrailDetailDto & { progressPercentage: number }>(`/student/trails/${id}`);
