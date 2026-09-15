'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@compliance/ui';
import { getCourse, validatePublish, publishCourse } from '@/lib/courses';
import { CourseStatus } from '@compliance/shared';

export default function PublishCoursePage(): React.JSX.Element {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => getCourse(courseId),
  });

  const { data: validation, isLoading: validating } = useQuery({
    queryKey: ['course-validation', courseId],
    queryFn: () => validatePublish(courseId),
  });

  const publishMutation = useMutation({
    mutationFn: () => publishCourse(courseId),
    onSuccess: () => router.push(`/admin/courses/${courseId}`),
  });

  if (course?.status === CourseStatus.PUBLISHED) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <h1 className="text-2xl font-bold">Curso já está publicado</h1>
        <Button asChild><Link href={`/admin/courses/${courseId}`}>Ver curso</Link></Button>
      </div>
    );
  }

  if (course?.status === CourseStatus.ARCHIVED) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
        <h1 className="text-2xl font-bold">Curso arquivado</h1>
        <p className="text-muted-foreground">Cursos arquivados não podem ser publicados novamente.</p>
        <Button variant="outline" asChild><Link href={`/admin/courses/${courseId}`}>Voltar</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Publicar curso</h1>
        <Button variant="outline" asChild><Link href={`/admin/courses/${courseId}`}>Cancelar</Link></Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Checklist de publicação</CardTitle>
        </CardHeader>
        <CardContent>
          {validating ? (
            <p className="text-sm text-muted-foreground">Verificando requisitos…</p>
          ) : validation ? (
            <div className="space-y-2">
              {validation.valid ? (
                <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  Todos os requisitos foram atendidos. O curso pode ser publicado.
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
                    <XCircle className="h-4 w-4 shrink-0" />
                    O curso não pode ser publicado ainda:
                  </div>
                  <ul className="space-y-1 pl-2">
                    {validation.errors.map((err, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-sm text-destructive">
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 space-y-1.5 text-sm">
                {[
                  { label: 'Título e descrição', ok: !!course?.title && !!course?.description },
                  { label: 'Duração estimada', ok: (course?.estimatedDurationMinutes ?? 0) > 0 },
                  { label: 'Módulo(s) com aulas', ok: (course?.moduleCount ?? 0) > 0 && (course?.lessonCount ?? 0) > 0 },
                  { label: 'Loja(s) vinculada(s)', ok: (course?.storeAccess.length ?? 0) > 0 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.ok ? (
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    )}
                    <span className={item.ok ? 'text-foreground' : 'text-muted-foreground'}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {publishMutation.isError && (
                <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {publishMutation.error instanceof Error ? publishMutation.error.message : 'Erro ao publicar'}
                </div>
              )}

              <Button
                className="w-full mt-2"
                disabled={!validation.valid || publishMutation.isPending}
                onClick={() => publishMutation.mutate()}
              >
                {publishMutation.isPending ? 'Publicando…' : 'Publicar curso'}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
