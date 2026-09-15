'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { BookOpen, Settings, Store, CheckCircle } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Separator } from '@compliance/ui';
import { CourseStatusBadge } from '@/components/ui/course-status-badge';
import { getCourse, archiveCourse } from '@/lib/courses';
import { CourseStatus } from '@compliance/shared';
import { formatDate, formatDuration } from '@/lib/utils';

export default function CourseDetailPage(): React.JSX.Element {
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();

  const { data: course, isLoading, isError } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getCourse(courseId),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveCourse,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (isError || !course) return <div className="text-sm text-destructive">Curso não encontrado.</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
          <p className="text-sm text-muted-foreground">{course.shortDescription}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" asChild><Link href="/admin/courses">Voltar</Link></Button>
          <Button asChild><Link href={`/admin/courses/${courseId}/edit`}><Settings className="mr-2 h-4 w-4" />Editar</Link></Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <CourseStatusBadge status={course.status} />
        {course.certificateEnabled && (
          <span className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            <CheckCircle className="h-3 w-3" />Certificado
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Duração', value: formatDuration(course.estimatedDurationMinutes) },
          { label: 'Módulos', value: course.moduleCount },
          { label: 'Aulas', value: course.lessonCount },
          { label: 'Nota mínima', value: course.minimumPassingScore != null ? `${course.minimumPassingScore}%` : '—' },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-4">
              <p className="text-xl font-bold">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" asChild>
          <Link href={`/admin/courses/${courseId}/modules`}>
            <BookOpen className="mr-2 h-4 w-4" />
            Módulos e aulas
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/admin/courses/${courseId}/stores`}>
            <Store className="mr-2 h-4 w-4" />
            Acesso por loja ({course.storeAccess.length})
          </Link>
        </Button>
        {course.status === CourseStatus.DRAFT && (
          <Button asChild>
            <Link href={`/admin/courses/${courseId}/publish`}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Publicar curso
            </Link>
          </Button>
        )}
        {course.status === CourseStatus.PUBLISHED && (
          <Button
            variant="outline"
            className="text-muted-foreground"
            onClick={() => archiveMutation.mutate(courseId)}
            disabled={archiveMutation.isPending}
          >
            Arquivar
          </Button>
        )}
      </div>

      {course.modules.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Conteúdo do curso</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {course.modules.map((module, idx) => (
                <div key={module.id}>
                  {idx > 0 && <Separator className="mb-3" />}
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {module.order}. {module.title}
                    </p>
                    <div className="ml-4 space-y-0.5">
                      {module.lessons.map((lesson) => (
                        <p key={lesson.id} className="text-xs text-muted-foreground">
                          {lesson.order}. {lesson.title}
                          {!lesson.required && ' (opcional)'}
                          {' '}— <span className="font-medium">{lesson.type}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {course.publishedAt && (
        <p className="text-xs text-muted-foreground">
          Publicado em {formatDate(course.publishedAt)}
        </p>
      )}
    </div>
  );
}
