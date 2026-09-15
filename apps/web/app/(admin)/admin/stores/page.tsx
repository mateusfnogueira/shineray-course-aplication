'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@compliance/ui';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StoreStatusBadge } from '@/components/ui/status-badge';
import { listStores, updateStoreStatus } from '@/lib/stores';
import { formatDate } from '@/lib/utils';

export default function StoresPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['stores', page, debouncedSearch],
    queryFn: () => listStores({ page, limit: 20, search: debouncedSearch || undefined }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateStoreStatus(id, active),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['stores'] }),
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
          <h1 className="text-2xl font-bold tracking-tight">Lojas</h1>
          <p className="text-sm text-muted-foreground">Gerencie as lojas da rede</p>
        </div>
        <Button asChild>
          <Link href="/admin/stores/new">
            <Plus className="mr-2 h-4 w-4" />
            Nova loja
          </Link>
        </Button>
      </div>

      <div>
        <input
          type="search"
          placeholder="Buscar por nome, código ou cidade…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Buscar lojas"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Cidade / Estado</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="w-32">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-destructive">
                  Erro ao carregar lojas.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.data.length === 0 && (
              <TableEmpty>Nenhuma loja encontrada.</TableEmpty>
            )}
            {data?.data.map((store) => (
              <TableRow key={store.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/stores/${store.id}`} className="hover:underline">
                    {store.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs">{store.code}</TableCell>
                <TableCell className="text-muted-foreground">
                  {[store.city, store.state].filter(Boolean).join(' / ') || '—'}
                </TableCell>
                <TableCell><StoreStatusBadge active={store.active} /></TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {formatDate(store.createdAt)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/stores/${store.id}/edit`}>Editar</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={store.active ? 'text-destructive hover:text-destructive' : ''}
                      onClick={() => statusMutation.mutate({ id: store.id, active: !store.active })}
                      disabled={statusMutation.isPending}
                    >
                      {store.active ? 'Inativar' : 'Ativar'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.meta.total} loja{data.meta.total !== 1 ? 's' : ''}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span>{page} / {data.meta.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

declare global {
  interface Window {
    __searchTimer: number;
  }
}
