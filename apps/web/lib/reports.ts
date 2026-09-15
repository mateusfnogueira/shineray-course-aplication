const API_BASE = `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/v1`;

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : '';
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Erro' }));
    throw new Error((body as { message?: string }).message ?? 'Erro');
  }
  return res.json() as Promise<T>;
}

export interface PaginatedReport<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ReportParams {
  page?: number;
  limit?: number;
  storeId?: string;
  courseId?: string;
  startDate?: string;
  endDate?: string;
}

function buildQuery(params: ReportParams): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') q.set(k, String(v)); });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function fetchCourseReport(params: ReportParams = {}) {
  return apiFetch<PaginatedReport<{
    courseId: string; courseTitle: string; totalEnrollments: number;
    completedEnrollments: number; completionRate: number; avgScore: number | null; certificatesIssued: number;
  }>>(`/reports/courses${buildQuery(params)}`);
}

export function fetchStudentReport(params: ReportParams = {}) {
  return apiFetch<PaginatedReport<{
    userId: string; name: string; email: string; storeName: string | null;
    position: string | null; totalEnrollments: number; completedEnrollments: number;
    completionRate: number; hasPendingRequired: boolean;
  }>>(`/reports/students${buildQuery(params)}`);
}

export function fetchStoreReport(params: ReportParams = {}) {
  return apiFetch<PaginatedReport<{
    storeId: string; storeName: string; storeCode: string; totalStudents: number;
    activeStudents: number; totalEnrollments: number; completedEnrollments: number; completionRate: number;
  }>>(`/reports/stores${buildQuery(params)}`);
}

export function fetchPendingReport(params: ReportParams = {}) {
  return apiFetch<PaginatedReport<{
    userId: string; studentName: string; storeName: string | null; courseTitle: string;
    assignmentType: string; progressPercentage: number; enrollmentStatus: string;
  }>>(`/reports/pending${buildQuery(params)}`);
}

export function fetchQuizResultsReport(params: ReportParams = {}) {
  return apiFetch<PaginatedReport<{
    attemptId: string; studentName: string; storeName: string | null; courseTitle: string;
    attemptNumber: number; score: number; passed: boolean; submittedAt: string;
  }>>(`/reports/quiz-results${buildQuery(params)}`);
}

export function fetchCertificatesReport(params: ReportParams = {}) {
  return apiFetch<PaginatedReport<{
    certificateCode: string; studentName: string; storeName: string | null; courseTitle: string;
    courseHours: number; issuedAt: string; expiresAt: string | null; status: string;
  }>>(`/reports/certificates${buildQuery(params)}`);
}

export function getExportUrl(type: string, params: ReportParams = {}): string {
  const q = buildQuery(params);
  const sep = q ? '&' : '?';
  return `${API_BASE}/reports/export.csv${q}${sep}type=${type}`;
}
