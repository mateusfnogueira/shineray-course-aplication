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

export type CertificateStatus = 'valid' | 'expired' | 'revoked';

export interface CertificateDto {
  id: string;
  certificateCode: string;
  courseName: string;
  courseHours: number;
  storeName: string | null;
  studentName: string;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  fileUrl: string | null;
  status: CertificateStatus;
}

export interface PublicCertificateDto {
  certificateCode: string;
  courseName: string;
  studentDisplayName: string;
  issuedAt: string;
  expiresAt: string | null;
  status: CertificateStatus;
}

// Student
export function listMyCertificates(): Promise<CertificateDto[]> {
  return apiFetch('/student/certificates');
}

export function getMyCertificate(id: string): Promise<CertificateDto> {
  return apiFetch(`/student/certificates/${id}`);
}

// Public
export function validateCertificate(code: string): Promise<PublicCertificateDto> {
  return apiFetch(`/certificate/validate/${code}`);
}

// Admin
export function listUserCertificates(userId: string): Promise<CertificateDto[]> {
  return apiFetch(`/users/${userId}/certificates`);
}

export function reissueCertificate(enrollmentId: string): Promise<CertificateDto> {
  return apiFetch(`/enrollments/${enrollmentId}/certificate/reissue`, { method: 'POST' });
}

export function revokeCertificate(certificateId: string): Promise<CertificateDto> {
  return apiFetch(`/certificates/${certificateId}/revoke`, { method: 'PATCH' });
}
