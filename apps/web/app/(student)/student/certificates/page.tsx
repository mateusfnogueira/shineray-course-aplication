'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Award, Download, ExternalLink } from 'lucide-react';
import { Badge } from '@compliance/ui';
import { listMyCertificates } from '@/lib/certificates';
import type { CertificateStatus } from '@/lib/certificates';
import { formatDate } from '@/lib/utils';

const STATUS: Record<CertificateStatus, { label: string; variant: 'success' | 'secondary' | 'destructive' }> = {
  valid: { label: 'Válido', variant: 'success' },
  expired: { label: 'Expirado', variant: 'secondary' },
  revoked: { label: 'Revogado', variant: 'destructive' },
};

export default function StudentCertificatesPage(): React.JSX.Element {
  const { data: certificates, isLoading } = useQuery({
    queryKey: ['student-certificates'],
    queryFn: listMyCertificates,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-yellow-500" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meus Certificados</h1>
          <p className="text-sm text-muted-foreground">
            {(certificates ?? []).length} certificado{(certificates ?? []).length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (certificates ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center">
          <Award className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Você ainda não possui certificados.
          </p>
          <Link href="/student/catalog" className="mt-2 inline-block text-sm text-primary hover:underline">
            Explorar cursos
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(certificates ?? []).map((cert) => {
            const s = STATUS[cert.status];
            return (
              <div
                key={cert.id}
                className="flex items-center justify-between rounded-lg border bg-card p-4"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{cert.courseName}</p>
                    <Badge variant={s.variant} className="shrink-0">{s.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cert.courseHours}h · Emitido em {formatDate(cert.issuedAt)}
                    {cert.storeName && ` · ${cert.storeName}`}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{cert.certificateCode}</p>
                </div>

                <div className="ml-4 flex shrink-0 items-center gap-2">
                  <Link
                    href={`/student/certificates/${cert.id}`}
                    className="rounded p-1.5 hover:bg-accent"
                    aria-label="Ver certificado"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  {cert.fileUrl && cert.status === 'valid' && (
                    <a
                      href={cert.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="rounded p-1.5 hover:bg-accent"
                      aria-label="Baixar PDF"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
