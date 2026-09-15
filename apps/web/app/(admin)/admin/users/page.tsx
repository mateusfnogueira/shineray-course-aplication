'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, UploadCloud, RefreshCw } from 'lucide-react';
import { Button } from '@compliance/ui';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/status-badge';
import { RoleBadge } from '@/components/ui/role-badge';
import { listUsers, resendInvite, updateUserStatus } from '@/lib/users';
import { UserStatus } from '@compliance/shared';
import { formatDateTime } from '@/lib/utils';

export default function UsersPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['users', page, debouncedSearch],
    queryFn: () => listUsers({ page, limit: 20, search: debouncedSearch || undefined }),
  });

  const resendMutation = useMutation({
    mutationFn: resendInvite,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      updateUserStatus(id, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['users'] }),
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
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os usuários da plataforma
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/users/import">
              <UploadCloud className="mr-2 h-4 w-4" />
              Importar CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/users/new">
              <Plus className="mr-2 h-4 w-4" />
              Novo usuário
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="search"
          placeholder="Buscar por nome ou e-mail…"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Buscar usuários"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead className="w-32">Ações</TableHead>
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
                  Erro ao carregar usuários.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && data?.data.length === 0 && (
              <TableEmpty>Nenhum usuário encontrado.</TableEmpty>
            )}
            {data?.data.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  <Link href={`/admin/users/${user.id}`} className="hover:underline">
                    {user.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell><RoleBadge role={user.role} /></TableCell>
                <TableCell><StatusBadge status={user.status} /></TableCell>
                <TableCell className="text-muted-foreground">{user.storeName ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/users/${user.id}/edit`}>Editar</Link>
                    </Button>
                    {user.status === 'INVITED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resendMutation.mutate(user.id)}
                        disabled={resendMutation.isPending}
                        aria-label={`Reenviar convite para ${user.name}`}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    )}
                    {user.status === 'ACTIVE' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => statusMutation.mutate({ id: user.id, status: UserStatus.INACTIVE })}
                        disabled={statusMutation.isPending}
                      >
                        Inativar
                      </Button>
                    )}
                    {user.status === 'INACTIVE' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => statusMutation.mutate({ id: user.id, status: UserStatus.ACTIVE })}
                        disabled={statusMutation.isPending}
                      >
                        Ativar
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
          <span>
            {data.meta.total} usuário{data.meta.total !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <span>
              {page} / {data.meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
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
