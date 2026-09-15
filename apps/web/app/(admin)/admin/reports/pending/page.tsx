'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Button } from '@compliance/ui';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchPendingReport, getExportUrl } from '@/lib/reports';
import { CourseProgress } from '@/components/ui/course-progress';

export default function PendingReportPage(): React.JSX.Element {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['report-pending', page],
    queryFn: () => fetchPendingReport({ page, limit: 50 }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Pendências Obrigatórias</h1>
          <p className="text-sm text-muted-foreground">Cursos obrigatórios não concluídos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/admin/reports">← Relatórios</Link></Button>
          <Button variant="outline" asChild>
            <a href={getExportUrl('pending')} download><Download className="mr-2 h-4 w-4" />CSV</a>
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Loja</TableHead>
              <TableHead>Curso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progresso</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && data?.data.length === 0 && <TableEmpty>Nenhuma pendência encontrada. 🎉</TableEmpty>}
            {data?.data.map((r, i) => (
              <TableRow key={`${r.userId}-${r.courseTitle}-${i}`}>
                <TableCell className="font-medium">{r.studentName}</TableCell>
                <TableCell className="text-muted-foreground">{r.storeName ?? '—'}</TableCell>
                <TableCell>{r.courseTitle}</TableCell>
                <TableCell>
                  <span className={`text-xs font-medium ${r.enrollmentStatus === 'IN_PROGRESS' ? 'text-blue-600' : 'text-muted-foreground'}`}>
                    {r.enrollmentStatus === 'IN_PROGRESS' ? 'Em andamento' : 'Não iniciado'}
                  </span>
                </TableCell>
                <TableCell className="w-32">
                  <CourseProgress percentage={r.progressPercentage} size="sm" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.meta.total} pendências</span>
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
