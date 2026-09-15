'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@compliance/ui';
import { StoreStatusBadge } from '@/components/ui/status-badge';
import { getStore, getStoreMetrics } from '@/lib/stores';
import { formatDate } from '@/lib/utils';

export default function StoreDetailPage(): React.JSX.Element {
  const { storeId } = useParams<{ storeId: string }>();

  const { data: store, isLoading } = useQuery({
    queryKey: ['store', storeId],
    queryFn: () => getStore(storeId),
  });

  const { data: metrics } = useQuery({
    queryKey: ['store-metrics', storeId],
    queryFn: () => getStoreMetrics(storeId),
    enabled: !!storeId,
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando…</div>;
  }

  if (!store) {
    return <div className="text-sm text-destructive">Loja não encontrada.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{store.name}</h1>
          <p className="font-mono text-sm text-muted-foreground">{store.code}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/admin/stores">Voltar</Link></Button>
          <Button asChild><Link href={`/admin/stores/${storeId}/edit`}>Editar</Link></Button>
        </div>
      </div>

      {metrics && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total de usuários', value: metrics.totalUsers },
            { label: 'Usuários ativos', value: metrics.activeUsers },
            { label: 'Taxa de conclusão', value: `${metrics.completionRate}%` },
          ].map((m) => (
            <Card key={m.label}>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Informações</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd><StoreStatusBadge active={store.active} /></dd>
            <dt className="text-muted-foreground">Cidade / Estado</dt>
            <dd>{[store.city, store.state].filter(Boolean).join(' / ') || '—'}</dd>
            <dt className="text-muted-foreground">Região</dt>
            <dd>{store.region ?? '—'}</dd>
            <dt className="text-muted-foreground">CNPJ</dt>
            <dd>{store.document ?? '—'}</dd>
            <dt className="text-muted-foreground">Criada em</dt>
            <dd>{formatDate(store.createdAt)}</dd>
          </dl>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href={`/admin/stores/${storeId}/users`}>Ver usuários</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/admin/stores/${storeId}/courses`}>Ver cursos</Link>
        </Button>
      </div>
    </div>
  );
}
