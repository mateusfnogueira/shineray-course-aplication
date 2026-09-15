const API_BASE = `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/v1/student`;

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : '';
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: { Authorization: `Bearer ${getToken()}`, ...(init?.headers ?? {}) },
  });
  if (!res.ok) return undefined as T;
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface NotificationDto {
  id: string; title: string; message: string; readAt: string | null; createdAt: string;
}

export const listNotifications = () => apiFetch<NotificationDto[]>('/notifications');
export const markNotificationRead = (id: string) =>
  apiFetch<void>(`/notifications/${id}/read`, { method: 'PATCH' });
export const markAllNotificationsRead = () =>
  apiFetch<void>('/notifications/read-all', { method: 'POST' });
