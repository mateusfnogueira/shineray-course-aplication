import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UserRole } from '@compliance/shared';
import type { UserProfileDto } from '@/lib/auth.types';
import type { MasterDashboardDto, StoreDashboardDto } from '@/lib/dashboard';

async function getUser(): Promise<UserProfileDto | null> {
  const store = await cookies();
  const token = store.get('access_token')?.value;
  if (!token) return null;
  try {
    const res = await fetch(`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json() as Promise<UserProfileDto>;
  } catch { return null; }
}

async function fetchDashboard(role: string, token: string): Promise<MasterDashboardDto | StoreDashboardDto | null> {
  const url = role === UserRole.MASTER_ADMIN
    ? `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/v1/dashboard/master`
    : `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/v1/dashboard/store`;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
    if (!res.ok) return null;
    return res.json() as Promise<MasterDashboardDto | StoreDashboardDto>;
  } catch { return null; }
}

// ─── Mini components ──────────────────────────────────────────────────────────

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }): React.JSX.Element {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function MiniBar({ label, value, max }: { label: string; value: number; max: number }): React.JSX.Element {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="truncate max-w-[70%]">{label}</span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Master dashboard ─────────────────────────────────────────────────────────

function MasterDashboardView({ data }: { data: MasterDashboardDto }): React.JSX.Element {
  const { overview } = data;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão global da plataforma</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Lojas ativas" value={overview.totalStores} />
        <MetricCard label="Alunos ativos" value={overview.activeStudents} />
        <MetricCard label="Cursos publicados" value={overview.publishedCourses} />
        <MetricCard label="Total de matrículas" value={overview.totalEnrollments} />
        <MetricCard label="Concluídos" value={overview.completedEnrollments} sub={`${overview.completionRate}% de conclusão`} />
        <MetricCard label="Em andamento" value={overview.inProgressEnrollments} />
        <MetricCard label="Não iniciados" value={overview.notStartedEnrollments} />
        <MetricCard label="Obrig. em atraso" value={overview.overdueRequiredEnrollments} />
      </div>

      {overview.avgQuizScore != null && (
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Média geral nos testes</p>
          <p className="text-2xl font-bold">{overview.avgQuizScore}%</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {data.completionByStore.length > 0 && (
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Conclusão por loja</h2>
              <Link href="/admin/reports/stores" className="text-xs text-primary hover:underline">Ver tudo</Link>
            </div>
            <div className="space-y-2">
              {data.completionByStore.slice(0, 8).map((s) => (
                <MiniBar key={s.storeId} label={`${s.storeName} (${s.totalEnrollments})`} value={s.completedEnrollments} max={s.totalEnrollments} />
              ))}
            </div>
          </div>
        )}

        {data.completionByCourse.length > 0 && (
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Conclusão por curso</h2>
              <Link href="/admin/reports/courses" className="text-xs text-primary hover:underline">Ver tudo</Link>
            </div>
            <div className="space-y-2">
              {data.completionByCourse.slice(0, 8).map((c) => (
                <MiniBar key={c.courseId} label={`${c.courseTitle} (${c.totalEnrollments})`} value={c.completedEnrollments} max={c.totalEnrollments} />
              ))}
            </div>
          </div>
        )}
      </div>

      {data.recentRegistrations.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Cadastros recentes</h2>
          <div className="space-y-1.5">
            {data.recentRegistrations.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span className="font-medium">{u.name}</span>
                <span className="text-xs text-muted-foreground">{u.role.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Relatório de cursos', href: '/admin/reports/courses' },
          { label: 'Relatório de alunos', href: '/admin/reports/students' },
          { label: 'Pendências', href: '/admin/reports/pending' },
          { label: 'Resultados de testes', href: '/admin/reports/quiz-results' },
          { label: 'Certificados', href: '/admin/reports/certificates' },
        ].map((r) => (
          <Link key={r.href} href={r.href} className="rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-accent">
            {r.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Store dashboard ──────────────────────────────────────────────────────────

function StoreDashboardView({ data }: { data: StoreDashboardDto }): React.JSX.Element {
  const { overview } = data;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Métricas da sua loja</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Total de alunos" value={overview.totalStudents} />
        <MetricCard label="Alunos ativos" value={overview.activeStudents} />
        <MetricCard label="Cursos disponíveis" value={overview.availableCourses} sub={`${overview.requiredCourses} obrigatórios`} />
        <MetricCard label="% de conclusão" value={`${overview.completionRate}%`} />
        <MetricCard label="Concluídos" value={overview.completedEnrollments} />
        <MetricCard label="Em andamento" value={overview.inProgressEnrollments} />
        <MetricCard label="Não iniciados" value={overview.notStartedEnrollments} />
        <MetricCard label="Com pendências obrig." value={overview.studentsWithPendingRequired} />
      </div>

      {(overview.passedAttempts + overview.failedAttempts) > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <MetricCard label="Aprovados em testes" value={overview.passedAttempts} />
          <MetricCard label="Reprovados" value={overview.failedAttempts} />
          {overview.avgQuizScore != null && <MetricCard label="Média dos testes" value={`${overview.avgQuizScore}%`} />}
        </div>
      )}

      {data.courseProgress.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Progresso por curso</h2>
            <Link href="/admin/reports/courses" className="text-xs text-primary hover:underline">Relatório completo</Link>
          </div>
          <div className="space-y-3">
            {data.courseProgress.map((c) => (
              <div key={c.courseId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate font-medium max-w-[60%]">{c.courseTitle}</span>
                  <span className="text-muted-foreground">{c.completed}/{c.totalStudents} ({c.completionRate}%)</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${c.completionRate}%` }} />
                </div>
                {c.assignmentType === 'REQUIRED' && (
                  <span className="text-xs text-orange-600 font-medium">Obrigatório</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Alunos pendentes', href: '/admin/reports/pending' },
          { label: 'Resultados de testes', href: '/admin/reports/quiz-results' },
          { label: 'Certificados', href: '/admin/reports/certificates' },
        ].map((r) => (
          <Link key={r.href} href={r.href} className="rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-accent">
            {r.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage(): Promise<React.JSX.Element> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const user = await getUser();

  if (!user) redirect('/login');

  const data = await fetchDashboard(user.role, token);

  if (!data) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Não foi possível carregar os dados. Tente novamente.</p>
      </div>
    );
  }

  if (user.role === UserRole.MASTER_ADMIN) {
    return <MasterDashboardView data={data as MasterDashboardDto} />;
  }

  return <StoreDashboardView data={data as StoreDashboardDto} />;
}
