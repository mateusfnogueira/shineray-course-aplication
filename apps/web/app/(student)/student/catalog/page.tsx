'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { CourseProgress } from '@/components/ui/course-progress';
import { getCatalog, addFavorite, removeFavorite } from '@/lib/student';
import { CourseAssignmentType } from '@compliance/shared';
import { formatDuration } from '@/lib/utils';
import { useQueryClient, useMutation } from '@tanstack/react-query';

export default function CatalogPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['student-catalog', page, debouncedSearch],
    queryFn: () => getCatalog({ page, limit: 20, search: debouncedSearch || undefined }),
  });

  const favMutation = useMutation({
    mutationFn: ({ courseId, add }: { courseId: string; add: boolean }) =>
      add ? addFavorite(courseId) : removeFavorite(courseId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['student-catalog'] }),
  });

  function handleSearch(value: string): void {
    setSearch(value);
    clearTimeout(window.__searchTimer);
    window.__searchTimer = window.setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 300);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Catálogo</h1>
        <p className="text-sm text-muted-foreground">Treinamentos disponíveis para sua loja</p>
      </div>

      <input
        type="search"
        placeholder="Buscar treinamentos…"
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Buscar treinamentos"
      />

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data?.data ?? []).map((course) => (
              <div key={course.id} className="relative flex flex-col rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
                <button
                  onClick={() => favMutation.mutate({ courseId: course.id, add: !course.isFavorited })}
                  className="absolute right-3 top-3 rounded-full p-1 hover:bg-accent"
                  aria-label={course.isFavorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  <Heart
                    className={`h-4 w-4 ${course.isFavorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                    aria-hidden
                  />
                </button>

                <div className="flex-1 pr-8">
                  <Link href={`/student/courses/${course.id}`} className="block">
                    <h2 className="font-semibold leading-tight hover:underline">{course.title}</h2>
                  </Link>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {course.shortDescription}
                  </p>

                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDuration(course.estimatedDurationMinutes)}</span>
                    <span>·</span>
                    <span>{course.lessonCount} {course.lessonCount === 1 ? 'aula' : 'aulas'}</span>
                    {course.assignmentType === CourseAssignmentType.REQUIRED && (
                      <>
                        <span>·</span>
                        <span className="font-medium text-orange-600">Obrigatório</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  {course.enrollment ? (
                    <div className="space-y-2">
                      <CourseProgress percentage={course.enrollment.progressPercentage} />
                      <Link
                        href={`/student/courses/${course.id}/learn`}
                        className="block w-full rounded-md bg-primary px-3 py-1.5 text-center text-xs font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        {course.enrollment.progressPercentage > 0 ? 'Continuar' : 'Iniciar'}
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href={`/student/courses/${course.id}`}
                      className="block w-full rounded-md border px-3 py-1.5 text-center text-xs font-medium hover:bg-accent"
                    >
                      Ver detalhes
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          {(data?.data ?? []).length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Nenhum treinamento encontrado.
            </div>
          )}

          {data && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2 text-sm">
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent">Anterior</button>
              <span className="text-muted-foreground">{page} / {data.meta.totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page === data.meta.totalPages} className="rounded border px-3 py-1 disabled:opacity-40 hover:bg-accent">Próxima</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

declare global { interface Window { __searchTimer: number } }
