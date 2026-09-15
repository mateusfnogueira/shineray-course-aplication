'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Layers } from 'lucide-react';
import { Button, Badge } from '@compliance/ui';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { listTrails, deleteTrail } from '@/lib/trails';
import { formatDuration } from '@/lib/utils';

export default function TrailsAdminPage(): React.JSX.Element {
  const queryClient = useQueryClient();

  const { data: trails, isLoading } = useQuery({ queryKey: ['admin-trails'], queryFn: listTrails });

  const deleteMutation = useMutation({
    mutationFn: deleteTrail,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-trails'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Trilhas de Aprendizado</h1>
            <p className="text-sm text-muted-foreground">Sequências estruturadas de cursos</p>
          </div>
        </div>
        <Button asChild>
          <Link href="/admin/trails/new"><Plus className="mr-2 h-4 w-4" />Nova trilha</Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Cursos</TableHead>
              <TableHead>Duração total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && (trails ?? []).length === 0 && <TableEmpty>Nenhuma trilha criada.</TableEmpty>}
            {(trails ?? []).map((trail) => (
              <TableRow key={trail.id}>
                <TableCell>
                  <Link href={`/admin/trails/${trail.id}`} className="font-medium hover:underline">{trail.title}</Link>
                </TableCell>
                <TableCell>{trail.courseCount} curso{trail.courseCount !== 1 ? 's' : ''}</TableCell>
                <TableCell className="text-muted-foreground">{formatDuration(trail.totalDurationMinutes)}</TableCell>
                <TableCell><Badge variant={trail.active ? 'success' : 'secondary'}>{trail.active ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" asChild><Link href={`/admin/trails/${trail.id}`}>Gerenciar</Link></Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { if (confirm('Excluir trilha?')) deleteMutation.mutate(trail.id); }}
                      disabled={deleteMutation.isPending}
                    >
                      Excluir
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
