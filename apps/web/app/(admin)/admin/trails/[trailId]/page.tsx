'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Separator } from '@compliance/ui';
import { getTrail, updateTrail, addCourseToTrail, removeCourseFromTrail, reorderTrailCourses } from '@/lib/trails';
import { listCourses } from '@/lib/courses';
import { formatDuration } from '@/lib/utils';

export default function TrailDetailPage(): React.JSX.Element {
  const { trailId } = useParams<{ trailId: string }>();
  const queryClient = useQueryClient();
  const [addingCourse, setAddingCourse] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');

  const { data: trail, isLoading } = useQuery({
    queryKey: ['admin-trail', trailId],
    queryFn: () => getTrail(trailId),
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses-select'],
    queryFn: () => listCourses({ limit: 100, status: undefined }),
  });

  const addMutation = useMutation({
    mutationFn: () => addCourseToTrail(trailId, selectedCourseId, (trail?.courses.length ?? 0) + 1),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-trail', trailId] });
      setAddingCourse(false);
      setSelectedCourseId('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (courseId: string) => removeCourseFromTrail(trailId, courseId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-trail', trailId] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () => updateTrail(trailId, { active: !trail?.active }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-trail', trailId] }),
  });

  const reorderMutation = useMutation({
    mutationFn: ({ courseId, direction }: { courseId: string; direction: 'up' | 'down' }) => {
      const sorted = [...(trail?.courses ?? [])].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((c) => c.courseId === courseId);
      if (idx === -1) return Promise.resolve();
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return Promise.resolve();
      const newOrder = sorted.map((c) => c.courseId);
      const [removed] = newOrder.splice(idx, 1);
      newOrder.splice(swapIdx, 0, removed ?? '');
      return reorderTrailCourses(trailId, newOrder);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-trail', trailId] }),
  });

  if (isLoading || !trail) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const sortedCourses = [...trail.courses].sort((a, b) => a.order - b.order);
  const linkedIds = new Set(trail.courses.map((c) => c.courseId));
  const availableCourses = (coursesData?.data ?? []).filter((c) => !linkedIds.has(c.id));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{trail.title}</h1>
          <p className="text-sm text-muted-foreground">{trail.description.slice(0, 100)}…</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/admin/trails">← Trilhas</Link></Button>
          <Button
            variant="outline"
            onClick={() => toggleActiveMutation.mutate()}
            disabled={toggleActiveMutation.isPending}
          >
            {trail.active ? 'Inativar' : 'Ativar'}
          </Button>
        </div>
      </div>

      <div className="flex gap-3 text-sm text-muted-foreground">
        <Badge variant={trail.active ? 'success' : 'secondary'}>{trail.active ? 'Ativa' : 'Inativa'}</Badge>
        <span>{trail.courseCount} cursos · {formatDuration(trail.totalDurationMinutes)}</span>
      </div>

      <Separator />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cursos da trilha (em ordem)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {sortedCourses.map((tc, idx) => (
            <div key={tc.courseId} className="flex items-center gap-2 rounded-md border bg-card p-2.5">
              <div className="flex flex-col gap-0.5">
                <button onClick={() => reorderMutation.mutate({ courseId: tc.courseId, direction: 'up' })} disabled={idx === 0 || reorderMutation.isPending} className="rounded p-0.5 hover:bg-muted disabled:opacity-30"><ChevronUp className="h-3 w-3" /></button>
                <button onClick={() => reorderMutation.mutate({ courseId: tc.courseId, direction: 'down' })} disabled={idx === sortedCourses.length - 1 || reorderMutation.isPending} className="rounded p-0.5 hover:bg-muted disabled:opacity-30"><ChevronDown className="h-3 w-3" /></button>
              </div>
              <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{tc.courseTitle}</p>
                <p className="text-xs text-muted-foreground">{formatDuration(tc.estimatedDurationMinutes)}</p>
              </div>
              <Badge variant={tc.courseStatus === 'PUBLISHED' ? 'success' : 'secondary'} className="text-xs shrink-0">
                {tc.courseStatus === 'PUBLISHED' ? 'Publicado' : tc.courseStatus}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-destructive hover:text-destructive shrink-0"
                onClick={() => removeMutation.mutate(tc.courseId)}
                disabled={removeMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {sortedCourses.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum curso adicionado ainda.</p>
          )}

          {addingCourse ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-2">
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Selecionar curso"
              >
                <option value="">Selecionar curso…</option>
                {availableCourses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <Button size="sm" className="h-8" onClick={() => addMutation.mutate()} disabled={!selectedCourseId || addMutation.isPending}>
                {addMutation.isPending ? '…' : 'Adicionar'}
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setAddingCourse(false)}>Cancelar</Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setAddingCourse(true)}
              disabled={availableCourses.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar curso
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
