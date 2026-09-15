'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { getCompletedCourses } from '@/lib/student';
import { formatDate, formatDuration } from '@/lib/utils';

export default function CompletedCoursesPage(): React.JSX.Element {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['student-completed'],
    queryFn: getCompletedCourses,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Concluídos</h1>
        <p className="text-sm text-muted-foreground">
          {(courses ?? []).length} curso{(courses ?? []).length !== 1 ? 's' : ''} concluído{(courses ?? []).length !== 1 ? 's' : ''}
        </p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (courses ?? []).length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Você ainda não concluiu nenhum curso.
        </div>
      ) : (
        <div className="space-y-2">
          {(courses ?? []).map((course) => (
            <Link
              key={course.id}
              href={`/student/courses/${course.id}`}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate font-medium">{course.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDuration(course.estimatedDurationMinutes)}</p>
                </div>
              </div>
              {course.enrollment?.completedAt && (
                <p className="ml-4 shrink-0 text-xs text-muted-foreground">
                  {formatDate(course.enrollment.completedAt)}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
