import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Primeiro Acesso' };

export default function FirstAccessLayout({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <>{children}</>;
}
