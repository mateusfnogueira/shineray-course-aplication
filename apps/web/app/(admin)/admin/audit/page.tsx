'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ScrollText, Search } from 'lucide-react';
import { Button } from '@compliance/ui';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/utils';

const API_BASE = `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/v1`;

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('access_token') ?? '') : '';
}

interface AuditLogDto {
  id: string; action: string; entityType: string; entityId: string | null;
  actorName: string | null; actorEmail: string | null; ipAddress: string | null; createdAt: string;
}

async function fetchAuditLogs(page: number, action: string, entityType: string) {
  const q = new URLSearchParams({ page: String(page), limit: '30' });
  if (action) q.set('action', action);
  if (entityType) q.set('entityType', entityType);
  const res = await fetch(`${API_BASE}/audit?${q.toString()}`, {
    credentials: 'include', headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) return { data: [], meta: { page: 1, limit: 30, total: 0, totalPages: 0 } };
  return res.json() as Promise<{ data: AuditLogDto[]; meta: { page: number; limit: number; total: number; totalPages: number } }>;
}

async function fetchEntityTypes(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/audit/entity-types`, {
    credentials: 'include', headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) return [];
  return res.json() as Promise<string[]>;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN_SUCCESS: 'text-green-600', LOGIN_FAILED: 'text-red-600',
  USER_CREATED: 'text-blue-600', COURSE_PUBLISHED: 'text-purple-600',
  CERTIFICATE_ISSUED: 'text-yellow-600',
};

export default function AuditPage(): React.JSX.Element {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [debouncedAction, setDebouncedAction] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, debouncedAction, entityFilter],
    queryFn: () => fetchAuditLogs(page, debouncedAction, entityFilter),
  });

  const { data: entityTypes } = useQuery({
    queryKey: ['audit-entity-types'],
    queryFn: fetchEntityTypes,
  });

  function handleActionSearch(v: string): void {
    setActionFilter(v);
    clearTimeout(window.__searchTimer);
    window.__searchTimer = window.setTimeout(() => { setDebouncedAction(v); setPage(1); }, 400);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="h-5 w-5" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auditoria</h1>
          <p className="text-sm text-muted-foreground">Histórico de ações administrativas</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Buscar ação…"
            value={actionFilter}
            onChange={(e) => handleActionSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Filtrar por ação"
          />
        </div>
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Filtrar por entidade"
        >
          <option value="">Todas as entidades</option>
          {(entityTypes ?? []).map((et) => <option key={et} value={et}>{et}</option>)}
        </select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data e hora</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>ID da entidade</TableHead>
              <TableHead>Ator</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && (data?.data ?? []).length === 0 && <TableEmpty>Nenhum evento encontrado.</TableEmpty>}
            {(data?.data ?? []).map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                <TableCell>
                  <span className={`text-xs font-mono font-medium ${ACTION_COLORS[log.action] ?? 'text-foreground'}`}>
                    {log.action}
                  </span>
                </TableCell>
                <TableCell className="text-xs">{log.entityType}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{log.entityId?.slice(0, 8) ?? '—'}</TableCell>
                <TableCell className="text-xs">
                  {log.actorName ? (
                    <div>
                      <p className="font-medium">{log.actorName}</p>
                      <p className="text-muted-foreground">{log.actorEmail}</p>
                    </div>
                  ) : '—'}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{log.ipAddress ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.meta.total} eventos</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
            <span>{page}/{data.meta.totalPages}</span>
            <Button variant="outline" size="sm" disabled={page === data.meta.totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}

declare global { interface Window { __searchTimer: number } }
