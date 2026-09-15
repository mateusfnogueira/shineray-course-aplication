'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PlayCircle } from 'lucide-react';
import { Button, Separator } from '@compliance/ui';
import { CourseProgress } from '@/components/ui/course-progress';
import { getStudentTrail } from '@/lib/trails';
import { formatDuration } from '@/lib/utils';

export default function StudentTrailDetailPage(): React.JSX.Element {
  const { trailId } = useParams<{ trailId: string }>();

  const { data: trail, isLoading, isError } = useQuery({
    queryKey: ['student-trail', trailId],
    queryFn: () => getStudentTrail(trailId),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (isError || !trail) return <div className="text-sm text-destructive">Trilha não encontrada.</div>;

  const sortedCourses = [...trail.courses].sort((a, b) => a.order - b.order);
  const pct = trail.progressPercentage ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button variant="outline" asChild>
        <Link href="/student/trails">← Trilhas</Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{trail.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{trail.description}</p>
      </div>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{trail.courseCount} cursos</span>
        <span>·</span>
        <span>{formatDuration(trail.totalDurationMinutes)}</span>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <p className="mb-2 text-xs text-muted-foreground font-medium">Seu progresso</p>
        <CourseProgress percentage={pct} />
        {pct === 100 && (
          <p className="mt-2 text-sm font-medium text-green-600">🎉 Trilha concluída!</p>
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Cursos da trilha</h2>
        {sortedCourses.map((tc, idx) => (
            <Link
              key={tc.courseId}
              href={`/student/courses/${tc.courseId}`}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-sm">{tc.courseTitle}</p>
                <p className="text-xs text-muted-foreground">{formatDuration(tc.estimatedDurationMinutes)}</p>
              </div>
              <PlayCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
      </div>
    </div>
  );
}
