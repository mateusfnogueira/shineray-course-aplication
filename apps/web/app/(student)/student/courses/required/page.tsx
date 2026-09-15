'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { CourseProgress } from '@/components/ui/course-progress';
import { getRequiredCourses } from '@/lib/student';
import { EnrollmentStatus } from '@compliance/shared';
import { formatDuration } from '@/lib/utils';

export default function RequiredCoursesPage(): React.JSX.Element {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['student-required'],
    queryFn: getRequiredCourses,
  });

  const pending = courses?.filter((c) => c.enrollment?.status !== EnrollmentStatus.COMPLETED) ?? [];
  const completed = courses?.filter((c) => c.enrollment?.status === EnrollmentStatus.COMPLETED) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cursos obrigatórios</h1>
          <p className="text-sm text-muted-foreground">Treinamentos de conclusão obrigatória</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <>
          {pending.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pendentes ({pending.length})</h2>
              <div className="space-y-2">
                {pending.map((course) => (
                  <Link
                    key={course.id}
                    href={course.enrollment ? `/student/courses/${course.id}/learn` : `/student/courses/${course.id}`}
                    className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{course.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDuration(course.estimatedDurationMinutes)}</p>
                    </div>
                    <div className="ml-4 w-32 shrink-0">
                      <CourseProgress percentage={course.enrollment?.progressPercentage ?? 0} size="sm" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Concluídos ({completed.length})</h2>
              <div className="space-y-2">
                {completed.map((course) => (
                  <Link
                    key={course.id}
                    href={`/student/courses/${course.id}`}
                    className="flex items-center justify-between rounded-lg border bg-card p-4 opacity-70 transition-colors hover:bg-accent hover:opacity-100"
                  >
                    <p className="truncate font-medium">{course.title}</p>
                    <span className="ml-4 shrink-0 text-xs font-semibold text-green-600">Concluído ✓</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {(courses ?? []).length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">Nenhum curso obrigatório para sua loja.</div>
          )}
        </>
      )}
    </div>
  );
}
