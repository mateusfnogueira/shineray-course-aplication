'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Award } from 'lucide-react';
import { Card, CardContent } from '@compliance/ui';
import { validateCertificate } from '@/lib/certificates';
import type { PublicCertificateDto, CertificateStatus } from '@/lib/certificates';
import { formatDate } from '@/lib/utils';

const STATUS_UI: Record<
  CertificateStatus,
  { label: string; description: string; icon: typeof CheckCircle2; color: string; bg: string }
> = {
  valid: {
    label: 'Certificado válido',
    description: 'Este certificado é autêntico e está em vigor.',
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
  },
  expired: {
    label: 'Certificado expirado',
    description: 'Este certificado era autêntico, mas ultrapassou a data de validade.',
    icon: AlertCircle,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50 border-yellow-200',
  },
  revoked: {
    label: 'Certificado revogado',
    description: 'Este certificado foi revogado e não é mais válido.',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
  },
};

export function CertificateValidationCard({ code }: { code: string }): React.JSX.Element {
  const [data, setData] = useState<PublicCertificateDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    validateCertificate(code)
      .then(setData)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Certificado não encontrado'),
      )
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        Verificando…
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6 text-center space-y-3">
          <XCircle className="mx-auto h-10 w-10 text-red-500" />
          <div>
            <p className="font-semibold text-red-700">Certificado não encontrado</p>
            <p className="text-sm text-red-600">
              {error ?? 'Este código não corresponde a nenhum certificado emitido.'}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Código consultado: {code}</p>
        </CardContent>
      </Card>
    );
  }

  const s = STATUS_UI[data.status];
  const Icon = s.icon;

  return (
    <div className="space-y-4">
      <Card className={`border-2 ${s.bg}`}>
        <CardContent className="pt-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Icon className={`h-8 w-8 ${s.color}`} />
          </div>
          <div>
            <p className={`font-bold text-lg ${s.color}`}>{s.label}</p>
            <p className="text-sm text-muted-foreground">{s.description}</p>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-2 text-left text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Award className="h-4 w-4 shrink-0" />
              <span className="font-medium text-foreground">{data.courseName}</span>
            </div>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Titular</dt>
                <dd className="font-medium">{data.studentDisplayName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Emitido em</dt>
                <dd>{formatDate(data.issuedAt)}</dd>
              </div>
              {data.expiresAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Válido até</dt>
                  <dd>{formatDate(data.expiresAt)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Código</dt>
                <dd className="font-mono">{data.certificateCode}</dd>
              </div>
            </dl>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Verificação realizada em {new Date().toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
    </div>
  );
}
