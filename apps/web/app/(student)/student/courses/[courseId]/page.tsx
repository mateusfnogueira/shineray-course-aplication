'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Heart, PlayCircle, BookOpen, CheckCircle2 } from 'lucide-react';
import { Button, Card, CardContent, Separator } from '@compliance/ui';
import { CourseProgress } from '@/components/ui/course-progress';
import {
  getStudentCourse,
  startCourse,
  addFavorite,
  removeFavorite,
} from '@/lib/student';
import { EnrollmentStatus, CourseAssignmentType } from '@compliance/shared';
import { formatDuration } from '@/lib/utils';

export default function StudentCourseDetailPage(): React.JSX.Element {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: course, isLoading, isError } = useQuery({
    queryKey: ['student-course', courseId],
    queryFn: () => getStudentCourse(courseId),
  });

  const startMutation = useMutation({
    mutationFn: () => startCourse(courseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['student-course', courseId] });
      router.push(`/student/courses/${courseId}/learn`);
    },
  });

  const favMutation = useMutation({
    mutationFn: () =>
      course?.isFavorited ? removeFavorite(courseId) : addFavorite(courseId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['student-course', courseId] }),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (isError || !course) return <div className="text-sm text-destructive">Curso não disponível.</div>;

  const isEnrolled = !!course.enrollment;
  const isCompleted = course.enrollment?.status === EnrollmentStatus.COMPLETED;
  const progressPct = course.enrollment?.progressPercentage ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/student/catalog" className="hover:underline">Catálogo</Link>
            <span>/</span>
            <span className="truncate">{course.title}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{course.shortDescription}</p>
        </div>
        <button
          onClick={() => favMutation.mutate()}
          disabled={favMutation.isPending}
          className="shrink-0 rounded-full p-2 hover:bg-accent"
          aria-label={course.isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Heart
            className={`h-5 w-5 ${course.isFavorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
            aria-hidden
          />
        </button>
      </div>

      {course.assignmentType === CourseAssignmentType.REQUIRED && (
        <div className="flex items-center gap-2 rounded-md bg-orange-50 px-3 py-2 text-sm text-orange-700">
          <span className="font-medium">Obrigatório</span> — Este treinamento é de conclusão obrigatória para sua loja.
        </div>
      )}

      {isEnrolled && (
        <Card>
          <CardContent className="pt-4">
            <CourseProgress percentage={progressPct} />
            {isCompleted && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                Curso concluído!
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Duração', value: formatDuration(course.estimatedDurationMinutes) },
          { label: 'Aulas', value: `${course.lessonCount}` },
          { label: 'Nota mínima', value: course.minimumPassingScore != null ? `${course.minimumPassingScore}%` : '—' },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border bg-card p-3">
            <p className="text-base font-bold">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex flex-col gap-2 sm:flex-row">
        {isEnrolled ? (
          <Button className="flex-1" asChild>
            <Link href={`/student/courses/${courseId}/learn`}>
              <PlayCircle className="mr-2 h-4 w-4" />
              {isCompleted ? 'Revisar curso' : (progressPct > 0 ? 'Continuar' : 'Iniciar')}
            </Link>
          </Button>
        ) : (
          <Button
            className="flex-1"
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending}
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            {startMutation.isPending ? 'Matriculando…' : 'Começar agora'}
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/student/catalog">
            <BookOpen className="mr-2 h-4 w-4" />
            Catálogo
          </Link>
        </Button>
      </div>
    </div>
  );
}
