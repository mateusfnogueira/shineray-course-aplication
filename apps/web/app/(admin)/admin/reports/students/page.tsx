'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Button } from '@compliance/ui';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchStudentReport, getExportUrl } from '@/lib/reports';
import { Badge } from '@compliance/ui';

export default function StudentsReportPage(): React.JSX.Element {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['report-students', page],
    queryFn: () => fetchStudentReport({ page, limit: 50 }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Relatório de Alunos</h1>
          <p className="text-sm text-muted-foreground">Progresso individual de cada aluno</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/admin/reports">← Relatórios</Link></Button>
          <Button variant="outline" asChild>
            <a href={getExportUrl('students')} download><Download className="mr-2 h-4 w-4" />CSV</a>
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right">Matrículas</TableHead>
              <TableHead className="text-right">Concluídos</TableHead>
              <TableHead className="text-right">% Conclusão</TableHead>
              <TableHead>Pendências</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && data?.data.length === 0 && <TableEmpty>Nenhum aluno encontrado.</TableEmpty>}
            {data?.data.map((r) => (
              <TableRow key={r.userId}>
                <TableCell>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.email}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">{r.storeName ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{r.position ?? '—'}</TableCell>
                <TableCell className="text-right">{r.totalEnrollments}</TableCell>
                <TableCell className="text-right">{r.completedEnrollments}</TableCell>
                <TableCell className="text-right">{r.completionRate}%</TableCell>
                <TableCell>
                  {r.hasPendingRequired && (
                    <Badge variant="warning">Pendente</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.meta.total} alunos</span>
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
