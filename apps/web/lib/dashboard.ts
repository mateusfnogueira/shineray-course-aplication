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
    throw new Error((body as { message?: string }).message ?? 'Erro');
  }
  return res.json() as Promise<T>;
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MasterOverviewDto {
  totalStores: number;
  activeStudents: number;
  publishedCourses: number;
  totalEnrollments: number;
  completedEnrollments: number;
  inProgressEnrollments: number;
  notStartedEnrollments: number;
  completionRate: number;
  overdueRequiredEnrollments: number;
  avgQuizScore: number | null;
}

export interface StoreCompletionDto {
  storeId: string;
  storeName: string;
  storeCode: string;
  totalStudents: number;
  totalEnrollments: number;
  completedEnrollments: number;
  completionRate: number;
}

export interface MasterDashboardDto {
  overview: MasterOverviewDto;
  completionByStore: StoreCompletionDto[];
  completionByCourse: Array<{
    courseId: string;
    courseTitle: string;
    totalEnrollments: number;
    completedEnrollments: number;
    completionRate: number;
  }>;
  recentRegistrations: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
}

export interface StoreOverviewDto {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  availableCourses: number;
  requiredCourses: number;
  completedEnrollments: number;
  inProgressEnrollments: number;
  notStartedEnrollments: number;
  completionRate: number;
  passedAttempts: number;
  failedAttempts: number;
  avgQuizScore: number | null;
  studentsWithPendingRequired: number;
}

export interface StoreDashboardDto {
  overview: StoreOverviewDto;
  courseProgress: Array<{
    courseId: string;
    courseTitle: string;
    assignmentType: string;
    totalStudents: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    completionRate: number;
  }>;
}

// ─── API functions ──────────────────────────────────────────────────────────

export function getMasterDashboard(): Promise<MasterDashboardDto> {
  return apiFetch('/dashboard/master');
}

export function getStoreDashboard(storeId?: string): Promise<StoreDashboardDto> {
  const q = storeId ? `?storeId=${storeId}` : '';
  return apiFetch(`/dashboard/store${q}`);
}
