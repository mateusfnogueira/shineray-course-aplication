'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { Button } from '@compliance/ui';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchQuizResultsReport, getExportUrl } from '@/lib/reports';
import { formatDate } from '@/lib/utils';

export default function QuizResultsReportPage(): React.JSX.Element {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['report-quiz', page],
    queryFn: () => fetchQuizResultsReport({ page, limit: 50 }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Resultados de Testes</h1>
          <p className="text-sm text-muted-foreground">Notas e tentativas nos testes dos cursos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link href="/admin/reports">← Relatórios</Link></Button>
          <Button variant="outline" asChild>
            <a href={getExportUrl('quiz-results')} download><Download className="mr-2 h-4 w-4" />CSV</a>
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
              <TableHead className="text-right">Tentativa</TableHead>
              <TableHead className="text-right">Nota</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && data?.data.length === 0 && <TableEmpty>Nenhum resultado encontrado.</TableEmpty>}
            {data?.data.map((r) => (
              <TableRow key={r.attemptId}>
                <TableCell className="font-medium">{r.studentName}</TableCell>
                <TableCell className="text-muted-foreground">{r.storeName ?? '—'}</TableCell>
                <TableCell>{r.courseTitle}</TableCell>
                <TableCell className="text-right">{r.attemptNumber}</TableCell>
                <TableCell className="text-right font-medium">{r.score}%</TableCell>
                <TableCell>
                  <span className={`text-xs font-semibold ${r.passed ? 'text-green-600' : 'text-red-600'}`}>
                    {r.passed ? 'Aprovado' : 'Reprovado'}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(r.submittedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.meta.total} tentativas</span>
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
