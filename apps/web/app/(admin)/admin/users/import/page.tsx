'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@compliance/ui';
import { importUsersFromCsv } from '@/lib/users';
import type { ImportResultDto } from '@/lib/users';

export default function ImportUsersPage(): React.JSX.Element {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResultDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError(null);
  }

  async function handleImport(): Promise<void> {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const res = await importUsersFromCsv(file);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importar usuários</h1>
          <p className="text-sm text-muted-foreground">Cadastre múltiplos alunos via planilha CSV</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/users">Voltar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formato do arquivo</CardTitle>
          <CardDescription>
            O arquivo CSV deve ter as seguintes colunas na primeira linha:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted p-3 font-mono text-xs">
            name,email,storeCode,position,phone
          </div>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li><strong>name</strong> — Nome completo (obrigatório)</li>
            <li><strong>email</strong> — E-mail válido e único (obrigatório)</li>
            <li><strong>storeCode</strong> — Código da loja (obrigatório)</li>
            <li><strong>position</strong> — Cargo (opcional)</li>
            <li><strong>phone</strong> — Telefone (opcional)</li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">Limite: 500 linhas por importação.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 py-10 transition-colors hover:border-primary/50"
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Selecionar arquivo CSV"
            >
              {file ? (
                <>
                  <FileText className="mb-2 h-8 w-8 text-primary" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </>
              ) : (
                <>
                  <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Clique para selecionar</p>
                  <p className="text-xs text-muted-foreground">CSV até 5 MB</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
              aria-hidden="true"
            />

            {error && (
              <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              className="w-full"
              disabled={!file || loading}
              onClick={() => { void handleImport(); }}
            >
              {loading ? 'Importando…' : 'Iniciar importação'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Resultado da importação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-3 gap-4 text-center">
              <div className="rounded-md bg-muted p-3">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="rounded-md bg-green-50 p-3">
                <p className="text-2xl font-bold text-green-700">{result.accepted}</p>
                <p className="text-xs text-green-600">Aceitos</p>
              </div>
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-2xl font-bold text-red-700">{result.rejected}</p>
                <p className="text-xs text-red-600">Rejeitados</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">Erros encontrados:</p>
                <div className="max-h-48 overflow-y-auto rounded-md border text-xs">
                  {result.errors.map((e, i) => (
                    <div key={i} className="border-b px-3 py-2 last:border-0">
                      <span className="font-medium">Linha {e.row} ({e.field}):</span>{' '}
                      {e.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
