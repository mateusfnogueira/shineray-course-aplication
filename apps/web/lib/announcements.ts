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

export interface AnnouncementDto {
  id: string; title: string; content: string; bannerImageUrl: string | null;
  startsAt: string | null; endsAt: string | null; active: boolean;
  storeIds: string[]; isGlobal: boolean; createdAt: string;
}

export const listAnnouncements = () => apiFetch<AnnouncementDto[]>('/announcements');
export const listStudentAnnouncements = () => apiFetch<AnnouncementDto[]>('/student/announcements');
export const createAnnouncement = (data: { title: string; content: string; storeIds?: string[]; active?: boolean }) =>
  apiFetch<AnnouncementDto>('/announcements', { method: 'POST', body: JSON.stringify(data) });
export const updateAnnouncement = (id: string, data: Partial<{ title: string; content: string; active: boolean }>) =>
  apiFetch<AnnouncementDto>(`/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteAnnouncement = (id: string) =>
  apiFetch<void>(`/announcements/${id}`, { method: 'DELETE' });
