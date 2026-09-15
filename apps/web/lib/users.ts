import type { PaginatedResponse } from '@compliance/shared';
import { type UserRole, type UserStatus } from '@compliance/shared';

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

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  storeId: string | null;
  storeName: string | null;
  phone: string | null;
  position: string | null;
  firstAccessCompletedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: UserRole;
  storeId?: string | null;
  phone?: string | null;
  position?: string | null;
}

export interface ImportResultDto {
  total: number;
  accepted: number;
  rejected: number;
  errors: Array<{ row: number; field: string; message: string }>;
}

export function listUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: UserStatus;
  role?: UserRole;
  storeId?: string;
}): Promise<PaginatedResponse<UserDto>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.role) query.set('role', params.role);
  if (params?.storeId) query.set('storeId', params.storeId);
  return apiFetch<PaginatedResponse<UserDto>>(`/users?${query.toString()}`);
}

export function getUser(id: string): Promise<UserDto> {
  return apiFetch<UserDto>(`/users/${id}`);
}

export function createUser(data: CreateUserInput): Promise<UserDto> {
  return apiFetch<UserDto>('/users', { method: 'POST', body: JSON.stringify(data) });
}

export function updateUser(id: string, data: Partial<Omit<CreateUserInput, 'email'>>): Promise<UserDto> {
  return apiFetch<UserDto>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function updateUserStatus(id: string, status: UserStatus): Promise<UserDto> {
  return apiFetch<UserDto>(`/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function resendInvite(id: string): Promise<void> {
  return apiFetch<void>(`/users/${id}/resend-invite`, { method: 'POST' });
}

export function importUsersFromCsv(file: File): Promise<ImportResultDto> {
  const formData = new FormData();
  formData.append('file', file);

  return fetch(`${API_BASE}/users/import`, {
    method: 'POST',
    credentials: 'include',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: formData,
  }).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Erro' }));
      throw new Error((body as { message?: string }).message ?? 'Erro na importação');
    }
    return res.json() as Promise<ImportResultDto>;
  });
}
