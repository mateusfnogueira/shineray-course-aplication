'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { CourseProgress } from '@/components/ui/course-progress';
import { getCatalog, removeFavorite } from '@/lib/student';
import { formatDuration } from '@/lib/utils';

export default function FavoritesPage(): React.JSX.Element {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['student-catalog-all'],
    queryFn: () => getCatalog({ limit: 100 }),
  });

  const unfavMutation = useMutation({
    mutationFn: removeFavorite,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['student-catalog-all'] }),
  });

  const favorites = (data?.data ?? []).filter((c) => c.isFavorited);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 fill-red-500 text-red-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Favoritos</h1>
          <p className="text-sm text-muted-foreground">
            {favorites.length} curso{favorites.length !== 1 ? 's' : ''} favoritado{favorites.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : favorites.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Você não favoritou nenhum curso ainda.</p>
          <Link href="/student/catalog" className="mt-2 inline-block text-sm text-primary hover:underline">
            Explorar catálogo
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {favorites.map((course) => (
            <div key={course.id} className="relative flex flex-col rounded-lg border bg-card p-4">
              <button
                onClick={() => unfavMutation.mutate(course.id)}
                disabled={unfavMutation.isPending}
                className="absolute right-3 top-3 rounded-full p-1 hover:bg-accent"
                aria-label={`Remover ${course.title} dos favoritos`}
              >
                <Heart className="h-4 w-4 fill-red-500 text-red-500" aria-hidden />
              </button>

              <div className="flex-1 pr-8">
                <Link href={`/student/courses/${course.id}`} className="block">
                  <h2 className="font-semibold leading-tight hover:underline">{course.title}</h2>
                </Link>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{course.shortDescription}</p>
                <p className="mt-2 text-xs text-muted-foreground">{formatDuration(course.estimatedDurationMinutes)} · {course.lessonCount} aulas</p>
              </div>

              <div className="mt-3">
                {course.enrollment ? (
                  <CourseProgress percentage={course.enrollment.progressPercentage} size="sm" />
                ) : (
                  <Link
                    href={`/student/courses/${course.id}`}
                    className="block w-full rounded-md border px-3 py-1.5 text-center text-xs font-medium hover:bg-accent"
                  >
                    Ver curso
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
