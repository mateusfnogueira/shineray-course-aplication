import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CertificateValidationCard } from './certificate-validation-card';

export const metadata: Metadata = { title: 'Validação de Certificado' };

export default async function CertificateValidatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<React.JSX.Element> {
  const { code } = await params;
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
          <CertificateValidationCard code={code} />
        </Suspense>
      </div>
    </div>
  );
}
