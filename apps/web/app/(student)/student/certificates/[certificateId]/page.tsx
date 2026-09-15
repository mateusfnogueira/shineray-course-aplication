'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Award, Download, ExternalLink, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button, Card, CardContent } from '@compliance/ui';
import { Badge } from '@compliance/ui';
import { getMyCertificate } from '@/lib/certificates';
import type { CertificateStatus } from '@/lib/certificates';
import { formatDate } from '@/lib/utils';

const STATUS_CONFIG: Record<CertificateStatus, { label: string; icon: typeof CheckCircle; color: string; variant: 'success' | 'secondary' | 'destructive' }> = {
  valid: { label: 'Certificado válido', icon: CheckCircle, color: 'text-green-500', variant: 'success' },
  expired: { label: 'Certificado expirado', icon: AlertCircle, color: 'text-yellow-500', variant: 'secondary' },
  revoked: { label: 'Certificado revogado', icon: XCircle, color: 'text-red-500', variant: 'destructive' },
};

export default function StudentCertificateDetailPage(): React.JSX.Element {
  const { certificateId } = useParams<{ certificateId: string }>();

  const { data: cert, isLoading, isError } = useQuery({
    queryKey: ['student-certificate', certificateId],
    queryFn: () => getMyCertificate(certificateId),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  if (isError || !cert) return <div className="text-sm text-destructive">Certificado não encontrado.</div>;

  const s = STATUS_CONFIG[cert.status];

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Certificado</h1>
        <Button variant="outline" asChild>
          <Link href="/student/certificates">Voltar</Link>
        </Button>
      </div>

      {/* Certificate visual */}
      <Card className="relative overflow-hidden border-2 border-blue-200">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white" />
        <CardContent className="relative py-8 text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Award className="h-8 w-8 text-yellow-500" />
            <Badge variant={s.variant}>{s.label}</Badge>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              CERTIFICADO DE CONCLUSÃO
            </p>
            <h2 className="mt-2 text-xl font-bold">{cert.courseName}</h2>
          </div>

          <div className="space-y-0.5">
            <p className="text-sm font-semibold">{cert.studentName}</p>
            {cert.storeName && (
              <p className="text-xs text-muted-foreground">{cert.storeName}</p>
            )}
          </div>

          <div className="flex justify-center gap-6 text-xs text-muted-foreground">
            <span><strong>{cert.courseHours}h</strong> de carga horária</span>
            <span>Emitido em <strong>{formatDate(cert.issuedAt)}</strong></span>
          </div>

          <p className="font-mono text-xs text-muted-foreground">{cert.certificateCode}</p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {cert.fileUrl && cert.status === 'valid' && (
          <Button asChild>
            <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer" download>
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </a>
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href={`/certificate/validate/${cert.certificateCode}`} target="_blank">
            <ExternalLink className="mr-2 h-4 w-4" />
            Ver validação pública
          </Link>
        </Button>
      </div>

      {/* Details */}
      <Card>
        <CardContent className="pt-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Código</dt>
            <dd className="font-mono text-xs">{cert.certificateCode}</dd>
            <dt className="text-muted-foreground">Emitido em</dt>
            <dd>{formatDate(cert.issuedAt)}</dd>
            {cert.expiresAt && (
              <>
                <dt className="text-muted-foreground">Expira em</dt>
                <dd>{formatDate(cert.expiresAt)}</dd>
              </>
            )}
            {cert.revokedAt && (
              <>
                <dt className="text-muted-foreground">Revogado em</dt>
                <dd className="text-destructive">{formatDate(cert.revokedAt)}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
