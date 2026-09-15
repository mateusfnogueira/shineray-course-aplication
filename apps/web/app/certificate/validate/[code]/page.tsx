import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CertificateValidationCard } from './certificate-validation-card';

export const metadata: Metadata = { title: 'Validação de Certificado' };

export default function CertificateValidatePage({
  params,
}: {
  params: { code: string };
}): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            COMPLIANCE TRAINING PLATFORM
          </p>
          <h1 className="mt-1 text-xl font-bold">Validação de Certificado</h1>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Verificando…</div>}>
          <CertificateValidationCard code={params.code} />
        </Suspense>
      </div>
    </div>
  );
}
