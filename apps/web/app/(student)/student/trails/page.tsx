'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Layers } from 'lucide-react';
import { CourseProgress } from '@/components/ui/course-progress';
import { listStudentTrails } from '@/lib/trails';
import { formatDuration } from '@/lib/utils';

export default function StudentTrailsPage(): React.JSX.Element {
  const { data: trails, isLoading } = useQuery({
    queryKey: ['student-trails'],
    queryFn: listStudentTrails,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trilhas de Aprendizado</h1>
          <p className="text-sm text-muted-foreground">Sequências estruturadas de treinamentos</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (trails ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <Layers className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Nenhuma trilha disponível no momento.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(trails ?? []).map((trail) => (
            <Link
              key={trail.id}
              href={`/student/trails/${trail.id}`}
              className="flex flex-col rounded-lg border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <h2 className="font-semibold leading-tight">{trail.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{trail.description}</p>

              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{trail.courseCount} curso{trail.courseCount !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>{formatDuration(trail.totalDurationMinutes)}</span>
              </div>

              <div className="mt-3 space-y-1">
                <CourseProgress percentage={trail.progressPercentage} size="sm" />
                <p className="text-xs text-muted-foreground">
                  {trail.completedCourses}/{trail.courseCount} concluídos
                </p>
              </div>

              {trail.nextCourseTitle && trail.progressPercentage < 100 && (
                <p className="mt-2 text-xs text-primary">
                  Próximo: {trail.nextCourseTitle}
                </p>
              )}

              {trail.progressPercentage === 100 && (
                <p className="mt-2 text-xs font-medium text-green-600">✓ Trilha concluída!</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
