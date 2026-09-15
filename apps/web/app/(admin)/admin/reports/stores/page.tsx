'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Button } from '@compliance/ui';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchStoreReport, getExportUrl } from '@/lib/reports';

export default function StoresReportPage(): React.JSX.Element {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['report-stores', page],
    queryFn: () => fetchStoreReport({ page, limit: 50 }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Relatório de Lojas</h1>
          <p className="text-sm text-muted-foreground">Comparativo de desempenho entre lojas</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/admin/reports">← Relatórios</Link></Button>
          <Button variant="outline" asChild>
            <a href={getExportUrl('stores')} download><Download className="mr-2 h-4 w-4" />CSV</a>
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Loja</TableHead>
              <TableHead>Código</TableHead>
              <TableHead className="text-right">Alunos</TableHead>
              <TableHead className="text-right">Ativos</TableHead>
              <TableHead className="text-right">Matrículas</TableHead>
              <TableHead className="text-right">Concluídos</TableHead>
              <TableHead className="text-right">% Conclusão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && data?.data.length === 0 && <TableEmpty>Nenhuma loja encontrada.</TableEmpty>}
            {data?.data.map((r) => (
              <TableRow key={r.storeId}>
                <TableCell className="font-medium">{r.storeName}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{r.storeCode}</TableCell>
                <TableCell className="text-right">{r.totalStudents}</TableCell>
                <TableCell className="text-right">{r.activeStudents}</TableCell>
                <TableCell className="text-right">{r.totalEnrollments}</TableCell>
                <TableCell className="text-right">{r.completedEnrollments}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 overflow-hidden rounded-full bg-secondary h-1.5">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${r.completionRate}%` }} />
                    </div>
                    <span>{r.completionRate}%</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.meta.total} lojas</span>
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
