import type { UserProfileDto, AuthResponseDto, PendingLegalDocumentDto } from './auth.types';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const BASE = `${API_BASE}/api/v1/auth`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Erro desconhecido' }));
    const msg = (body as { message?: string }).message ?? 'Erro na requisição';
    throw new AuthApiError(msg, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

export async function login(email: string, password: string): Promise<AuthResponseDto> {
  const data = await request<AuthResponseDto>('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  // Store access token for API calls (non-httpOnly cookie is set by the server)
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', data.accessToken);
  }

  return data;
}

export async function refresh(): Promise<{ accessToken: string }> {
  const data = await request<{ accessToken: string }>('/refresh', { method: 'POST' });

  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', data.accessToken);
  }

  return data;
}

export async function logout(): Promise<void> {
  await request<void>('/logout', { method: 'POST' });

  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
  }
}

export async function forgotPassword(email: string): Promise<void> {
  await request<void>('/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await request<void>('/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export async function activateAccount(token: string, password: string): Promise<AuthResponseDto> {
  const data = await request<AuthResponseDto>('/activate-account', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', data.accessToken);
  }

  return data;
}

export async function getMe(): Promise<UserProfileDto> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return request<UserProfileDto>('/me', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  await request<void>('/change-password', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
  }
}

export async function getPendingLegalDocuments(): Promise<PendingLegalDocumentDto[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return request<PendingLegalDocumentDto[]>('/pending-legal-documents', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function acceptLegalDocument(legalDocumentId: string): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  await request<void>('/accept-legal-document', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: JSON.stringify({ legalDocumentId }),
  });
}
