'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@compliance/ui';
import { StatusBadge } from '@/components/ui/status-badge';
import { RoleBadge } from '@/components/ui/role-badge';
import { getUser } from '@/lib/users';
import { formatDateTime, formatDate } from '@/lib/utils';

export default function UserDetailPage(): React.JSX.Element {
  const { userId } = useParams<{ userId: string }>();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUser(userId),
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando…</div>;
  }

  if (isError || !user) {
    return <div className="text-sm text-destructive">Usuário não encontrado.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/users">Voltar</Link>
          </Button>
          <Button asChild>
            <Link href={`/admin/users/${userId}/edit`}>Editar</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <dt className="text-muted-foreground">E-mail</dt>
            <dd>{user.email}</dd>

            <dt className="text-muted-foreground">Perfil</dt>
            <dd><RoleBadge role={user.role} /></dd>

            <dt className="text-muted-foreground">Status</dt>
            <dd><StatusBadge status={user.status} /></dd>

            <dt className="text-muted-foreground">Loja</dt>
            <dd>{user.storeName ?? '—'}</dd>

            <dt className="text-muted-foreground">Cargo</dt>
            <dd>{user.position ?? '—'}</dd>

            <dt className="text-muted-foreground">Telefone</dt>
            <dd>{user.phone ?? '—'}</dd>

            <dt className="text-muted-foreground">Primeiro acesso</dt>
            <dd>{user.firstAccessCompletedAt ? formatDate(user.firstAccessCompletedAt) : '—'}</dd>

            <dt className="text-muted-foreground">Último acesso</dt>
            <dd>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'}</dd>

            <dt className="text-muted-foreground">Cadastrado em</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
