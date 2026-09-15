'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@compliance/ui';
import { getPendingLegalDocuments, acceptLegalDocument, AuthApiError } from '@/lib/auth';
import type { PendingLegalDocumentDto } from '@/lib/auth.types';
import { UserRole } from '@compliance/shared';

export default function AcceptTermsPage(): React.JSX.Element {
  const router = useRouter();
  const [documents, setDocuments] = useState<PendingLegalDocumentDto[]>([]);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPendingLegalDocuments()
      .then((docs) => {
        setDocuments(docs);
        if (docs.length === 0) {
          redirectToDashboard();
        }
      })
      .catch(() => setError('Erro ao carregar documentos'))
      .finally(() => setLoading(false));
  }, []); // runs once on mount

  function redirectToDashboard(): void {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { role?: string };
      router.push(payload.role === UserRole.STUDENT ? '/student' : '/admin');
    } catch {
      router.push('/admin');
    }
  }

  function toggleAccept(docId: string): void {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }

  async function handleSubmit(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      await Promise.all(documents.map((doc) => acceptLegalDocument(doc.id)));
      redirectToDashboard();
    } catch (err) {
      setError(err instanceof AuthApiError ? err.message : 'Erro ao registrar aceite');
    } finally {
      setSubmitting(false);
    }
  }

  const allAccepted = documents.every((doc) => accepted.has(doc.id));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando documentos…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Termos e Políticas</h1>
          <p className="text-sm text-muted-foreground">
            Para continuar, você precisa aceitar os documentos abaixo
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {documents.map((doc) => (
          <Card key={doc.id}>
            <CardHeader>
              <CardTitle className="text-base">{doc.title}</CardTitle>
              <CardDescription>Versão {doc.version}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm leading-relaxed"
                aria-label={`Conteúdo: ${doc.title}`}
              >
                {doc.content}
              </div>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
                  checked={accepted.has(doc.id)}
                  onChange={() => toggleAccept(doc.id)}
                  aria-label={`Aceitar ${doc.title}`}
                />
                <span className="text-sm">
                  Li e aceito os termos do documento{' '}
                  <strong>{doc.title}</strong> (v{doc.version})
                </span>
              </label>
            </CardContent>
          </Card>
        ))}

        <Button
          className="w-full"
          disabled={!allAccepted || submitting}
          onClick={() => { void handleSubmit(); }}
          aria-disabled={!allAccepted}
        >
          {submitting ? 'Registrando aceite…' : 'Aceitar e continuar'}
        </Button>
      </div>
    </div>
  );
}
