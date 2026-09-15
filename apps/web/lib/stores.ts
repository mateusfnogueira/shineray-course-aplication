import type { PaginatedResponse } from '@compliance/shared';

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

export interface StoreDto {
  id: string;
  name: string;
  code: string;
  document: string | null;
  region: string | null;
  city: string | null;
  state: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreInput {
  name: string;
  code: string;
  document?: string | null;
  region?: string | null;
  city?: string | null;
  state?: string | null;
}

export function listStores(params?: {
  page?: number;
  limit?: number;
  search?: string;
  active?: boolean;
}): Promise<PaginatedResponse<StoreDto>> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  if (params?.active !== undefined) query.set('active', String(params.active));
  return apiFetch<PaginatedResponse<StoreDto>>(`/stores?${query.toString()}`);
}

export function getStore(id: string): Promise<StoreDto> {
  return apiFetch<StoreDto>(`/stores/${id}`);
}

export function createStore(data: CreateStoreInput): Promise<StoreDto> {
  return apiFetch<StoreDto>('/stores', { method: 'POST', body: JSON.stringify(data) });
}

export function updateStore(id: string, data: Partial<CreateStoreInput>): Promise<StoreDto> {
  return apiFetch<StoreDto>(`/stores/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function updateStoreStatus(id: string, active: boolean): Promise<StoreDto> {
  return apiFetch<StoreDto>(`/stores/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

export function getStoreMetrics(id: string): Promise<{
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  completionRate: number;
}> {
  return apiFetch(`/stores/${id}/metrics`);
}
