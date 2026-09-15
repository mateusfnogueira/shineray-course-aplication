'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Trash2, Plus } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@compliance/ui';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getCourse, getStoreAccess, setStoreAccess, removeStoreAccess } from '@/lib/courses';
import type { StoreAccessItem } from '@/lib/courses';
import { listStores } from '@/lib/stores';
import { CourseAssignmentType } from '@compliance/shared';

export default function CourseStoresPage(): React.JSX.Element {
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newStoreId, setNewStoreId] = useState('');
  const [newAssignment, setNewAssignment] = useState<CourseAssignmentType>(CourseAssignmentType.OPTIONAL);

  const { data: course } = useQuery({ queryKey: ['course', courseId], queryFn: () => getCourse(courseId) });
  const { data: accesses, isLoading } = useQuery({ queryKey: ['course-access', courseId], queryFn: () => getStoreAccess(courseId) });
  const { data: storesData } = useQuery({ queryKey: ['stores-select'], queryFn: () => listStores({ limit: 100, active: true }) });

  const setAccessMutation = useMutation({
    mutationFn: (newAccesses: StoreAccessItem[]) => setStoreAccess(courseId, newAccesses),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['course-access', courseId] });
      void queryClient.invalidateQueries({ queryKey: ['course', courseId] });
      setAdding(false);
      setNewStoreId('');
    },
  });

  const removeAccessMutation = useMutation({
    mutationFn: (storeId: string) => removeStoreAccess(courseId, storeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['course-access', courseId] });
      void queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
  });

  function handleAddAccess(): void {
    if (!newStoreId) return;
    const current = accesses ?? [];
    const newAccesses: StoreAccessItem[] = [
      ...current.map((a) => ({
        storeId: a.storeId,
        assignmentType: a.assignmentType,
        availableFrom: a.availableFrom,
        availableUntil: a.availableUntil,
        active: a.active,
      })),
      { storeId: newStoreId, assignmentType: newAssignment, active: true },
    ];
    setAccessMutation.mutate(newAccesses);
  }

  const linkedStoreIds = new Set((accesses ?? []).map((a) => a.storeId));
  const availableStores = storesData?.data.filter((s) => !linkedStoreIds.has(s.id)) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Acesso por loja</h1>
          <p className="text-sm text-muted-foreground">{course?.title}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href={`/admin/courses/${courseId}`}>Voltar</Link></Button>
          <Button variant="outline" asChild><Link href={`/admin/courses/${courseId}/publish`}>Publicar</Link></Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Lojas vinculadas</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Carregando…</TableCell>
                  </TableRow>
                )}
                {!isLoading && (accesses ?? []).length === 0 && (
                  <TableEmpty>Nenhuma loja vinculada. Adicione ao menos uma para publicar o curso.</TableEmpty>
                )}
                {(accesses ?? []).map((access) => (
                  <TableRow key={access.storeId}>
                    <TableCell className="font-medium">{access.storeName}</TableCell>
                    <TableCell className="font-mono text-xs">{access.storeCode}</TableCell>
                    <TableCell>
                      <select
                        value={access.assignmentType}
                        onChange={(e) => {
                          const updated = (accesses ?? []).map((a) =>
                            a.storeId === access.storeId
                              ? { ...a, assignmentType: e.target.value }
                              : { storeId: a.storeId, assignmentType: a.assignmentType, availableFrom: a.availableFrom, availableUntil: a.availableUntil, active: a.active },
                          );
                          setAccessMutation.mutate(updated as StoreAccessItem[]);
                        }}
                        className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                        aria-label={`Tipo de acesso para ${access.storeName}`}
                      >
                        <option value={CourseAssignmentType.OPTIONAL}>Opcional</option>
                        <option value={CourseAssignmentType.REQUIRED}>Obrigatório</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={access.active}
                        onChange={(e) => {
                          const updated = (accesses ?? []).map((a) =>
                            a.storeId === access.storeId
                              ? { ...a, active: e.target.checked }
                              : { storeId: a.storeId, assignmentType: a.assignmentType, availableFrom: a.availableFrom, availableUntil: a.availableUntil, active: a.active },
                          );
                          setAccessMutation.mutate(updated as StoreAccessItem[]);
                        }}
                        className="h-4 w-4 accent-primary"
                        aria-label={`Ativar acesso para ${access.storeName}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-destructive hover:text-destructive"
                        onClick={() => removeAccessMutation.mutate(access.storeId)}
                        disabled={removeAccessMutation.isPending}
                        aria-label={`Remover acesso de ${access.storeName}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {adding ? (
            <div className="mt-3 flex items-center gap-2 rounded-md border bg-muted/30 p-2">
              <select
                value={newStoreId}
                onChange={(e) => setNewStoreId(e.target.value)}
                className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm"
                aria-label="Selecionar loja"
              >
                <option value="">Selecionar loja…</option>
                {availableStores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </select>
              <select
                value={newAssignment}
                onChange={(e) => setNewAssignment(e.target.value as CourseAssignmentType)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                aria-label="Tipo de acesso"
              >
                <option value={CourseAssignmentType.OPTIONAL}>Opcional</option>
                <option value={CourseAssignmentType.REQUIRED}>Obrigatório</option>
              </select>
              <Button size="sm" className="h-8" onClick={handleAddAccess} disabled={!newStoreId || setAccessMutation.isPending}>
                {setAccessMutation.isPending ? '…' : 'Adicionar'}
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setAdding(false)}>Cancelar</Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-dashed"
              onClick={() => setAdding(true)}
              disabled={availableStores.length === 0}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Vincular loja
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
