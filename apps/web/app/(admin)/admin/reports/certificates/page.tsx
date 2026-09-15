'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Button } from '@compliance/ui';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchCertificatesReport, getExportUrl } from '@/lib/reports';
import { Badge } from '@compliance/ui';
import { formatDate } from '@/lib/utils';

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'secondary' | 'destructive' }> = {
  valid: { label: 'Válido', variant: 'success' },
  expired: { label: 'Expirado', variant: 'secondary' },
  revoked: { label: 'Revogado', variant: 'destructive' },
};

export default function CertificatesReportPage(): React.JSX.Element {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['report-certs', page],
    queryFn: () => fetchCertificatesReport({ page, limit: 50 }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Certificados</h1>
          <p className="text-sm text-muted-foreground">Certificados emitidos e status</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/admin/reports">← Relatórios</Link></Button>
          <Button variant="outline" asChild>
            <a href={getExportUrl('certificates')} download><Download className="mr-2 h-4 w-4" />CSV</a>
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Aluno</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Carga</TableHead>
              <TableHead>Emitido em</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && data?.data.length === 0 && <TableEmpty>Nenhum certificado encontrado.</TableEmpty>}
            {data?.data.map((r, i) => {
              const s = STATUS_BADGE[r.status] ?? { label: r.status, variant: 'secondary' as const };
              return (
                <TableRow key={`${r.certificateCode}-${i}`}>
                  <TableCell className="font-mono text-xs">{r.certificateCode}</TableCell>
                  <TableCell className="font-medium">{r.studentName}</TableCell>
                  <TableCell className="text-muted-foreground">{r.storeName ?? '—'}</TableCell>
                  <TableCell>{r.courseTitle}</TableCell>
                  <TableCell className="text-muted-foreground">{r.courseHours}h</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(r.issuedAt)}</TableCell>
                  <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.meta.total} certificados</span>
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
