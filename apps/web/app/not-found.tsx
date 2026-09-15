import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Página não encontrada',
};

export default function NotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Erro 404
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Página não encontrada</h1>
        <p className="max-w-md text-muted-foreground">
          A página que você está procurando não existe ou foi removida.
        </p>
      </div>
      <Link
        href="/login"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
