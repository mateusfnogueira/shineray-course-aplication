  'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, PlayCircle, CheckCircle2, Clock } from 'lucide-react';
import { Card, CardContent } from '@compliance/ui';
import { CourseProgress } from '@/components/ui/course-progress';
import { getDashboard } from '@/lib/student';
import { formatDuration } from '@/lib/utils';

export default function StudentDashboardPage(): React.JSX.Element {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: getDashboard,
  });

  if (isLoading || !dashboard) {
    return <div className="text-sm text-muted-foreground">Carregando…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {dashboard.userName.split(' ')[0]}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe seu progresso nos treinamentos
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total', value: dashboard.stats.totalEnrollments, icon: Clock, color: '' },
          { label: 'Concluídos', value: dashboard.stats.completed, icon: CheckCircle2, color: 'text-green-600' },
          { label: 'Em andamento', value: dashboard.stats.inProgress, icon: PlayCircle, color: 'text-blue-600' },
          { label: 'Obrigatórios pendentes', value: dashboard.stats.requiredPending, icon: AlertCircle, color: 'text-orange-600' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 pt-4">
              <stat.icon className={`h-8 w-8 ${stat.color || 'text-muted-foreground'}`} aria-hidden />
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {dashboard.stats.totalEnrollments > 0 && (
        <Card>
          <CardContent className="pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Progresso geral</p>
            <CourseProgress percentage={dashboard.stats.overallProgressPercentage} />
          </CardContent>
        </Card>
      )}

      {/* Continue learning */}
      {dashboard.lastAccessedEnrollmentId && (
        <section>
          <h2 className="mb-3 text-base font-semibold">Continuar de onde parou</h2>
          <Link
            href={`/student/courses/${dashboard.lastAccessedCourseId ?? ''}/learn`}
            className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
          >
            <p className="text-sm font-medium">Continuar treinamento</p>
            <p className="text-xs text-muted-foreground">Toque para continuar de onde parou</p>
          </Link>
        </section>
      )}

      {/* Required pending */}
      {dashboard.requiredPending.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Obrigatórios pendentes</h2>
            <Link href="/student/courses/required" className="text-xs text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="space-y-2">
            {dashboard.requiredPending.map((course) => (
              <Link
                key={course.id}
                href={`/student/courses/${course.id}`}
                className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{course.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDuration(course.estimatedDurationMinutes)}</p>
                </div>
                {course.enrollment && (
                  <div className="ml-4 w-24 shrink-0">
                    <CourseProgress
                      percentage={course.enrollment.progressPercentage}
                      size="sm"
                      showLabel={false}
                    />
                    <p className="mt-0.5 text-right text-xs text-muted-foreground">
                      {course.enrollment.progressPercentage}%
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* In progress */}
      {dashboard.inProgress.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Em andamento</h2>
            <Link href="/student/courses/in-progress" className="text-xs text-primary hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="space-y-2">
            {dashboard.inProgress.map((course) => (
              <Link
                key={course.id}
                href={`/student/courses/${course.id}/learn`}
                className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{course.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDuration(course.estimatedDurationMinutes)}</p>
                </div>
                {course.enrollment && (
                  <div className="ml-4 w-24 shrink-0">
                    <CourseProgress
                      percentage={course.enrollment.progressPercentage}
                      size="sm"
                      showLabel={false}
                    />
                    <p className="mt-0.5 text-right text-xs text-muted-foreground">
                      {course.enrollment.progressPercentage}%
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {dashboard.stats.totalEnrollments === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Você ainda não está matriculado em nenhum curso.
          </p>
          <Link href="/student/catalog" className="mt-2 inline-block text-sm text-primary hover:underline">
            Explorar catálogo
          </Link>
        </div>
      )}
    </div>
  );
}
