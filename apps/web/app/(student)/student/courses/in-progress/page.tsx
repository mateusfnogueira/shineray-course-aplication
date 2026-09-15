'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CourseProgress } from '@/components/ui/course-progress';
import { getInProgressCourses } from '@/lib/student';
import { formatDuration } from '@/lib/utils';

export default function InProgressCoursesPage(): React.JSX.Element {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['student-in-progress'],
    queryFn: getInProgressCourses,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Em andamento</h1>
        <p className="text-sm text-muted-foreground">Continue de onde parou</p>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (courses ?? []).length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Nenhum curso em andamento.{' '}
          <Link href="/student/catalog" className="text-primary hover:underline">Explorar catálogo</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {(courses ?? []).map((course) => (
            <Link
              key={course.id}
              href={`/student/courses/${course.id}/learn`}
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
      )}
    </div>
  );
}
