'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, BookOpen } from 'lucide-react';
import { Button } from '@compliance/ui';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CourseStatusBadge } from '@/components/ui/course-status-badge';
import { listCourses, archiveCourse } from '@/lib/courses';
import { CourseStatus } from '@compliance/shared';
import { formatDate, formatDuration } from '@/lib/utils';

export default function CoursesPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CourseStatus | ''>('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['courses', page, debouncedSearch, statusFilter],
    queryFn: () => listCourses({
      page,
      limit: 20,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
    }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveCourse,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['courses'] }),
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cursos</h1>
          <p className="text-sm text-muted-foreground">Gerencie os treinamentos da plataforma</p>
        </div>
        <Button asChild>
          <Link href="/admin/courses/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo curso
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="search"
          placeholder="Buscar por título…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Buscar cursos"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as CourseStatus | ''); setPage(1); }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Filtrar por status"
        >
          <option value="">Todos os status</option>
          <option value={CourseStatus.DRAFT}>Rascunho</option>
          <option value={CourseStatus.PUBLISHED}>Publicado</option>
          <option value={CourseStatus.ARCHIVED}>Arquivado</option>
        </select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Módulos</TableHead>
              <TableHead>Aulas</TableHead>
              <TableHead>Publicado em</TableHead>
              <TableHead className="w-36">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-sm text-destructive">
                  Erro ao carregar cursos.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.data.length === 0 && (
              <TableEmpty>
                <div className="flex flex-col items-center gap-2">
                  <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                  Nenhum curso encontrado.
                </div>
              </TableEmpty>
            )}
            {data?.data.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/courses/${course.id}`} className="hover:underline">
                    {course.title}
                  </Link>
                </TableCell>
                <TableCell><CourseStatusBadge status={course.status} /></TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDuration(course.estimatedDurationMinutes)}
                </TableCell>
                <TableCell className="text-center">{course.moduleCount}</TableCell>
                <TableCell className="text-center">{course.lessonCount}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {course.publishedAt ? formatDate(course.publishedAt) : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/courses/${course.id}/edit`}>Editar</Link>
                    </Button>
                    {course.status === CourseStatus.DRAFT && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/courses/${course.id}/publish`}>Publicar</Link>
                      </Button>
                    )}
                    {course.status === CourseStatus.PUBLISHED && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => archiveMutation.mutate(course.id)}
                        disabled={archiveMutation.isPending}
                      >
                        Arquivar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.meta.total} curso{data.meta.total !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <span>{page} / {data.meta.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}

declare global { interface Window { __searchTimer: number; } }
