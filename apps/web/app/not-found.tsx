import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import { HouseIcon } from '@/components/icons/house-icon';
import { KeyIcon } from '@/components/icons/key-icon';
import { FirstAccessIcon } from '@/components/icons/first-access-icon';

export const metadata: Metadata = {
  title: 'Shineray – ERRO 404',
};

export default function NotFound(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-gray-100 px-8 py-4">
        <Image
          src="/images/shineray-logo.png"
          alt="Shineray"
          width={120}
          height={36}
          className="h-auto"
          priority
        />
        <span className="text-sm text-gray-400">Portal de Treinamentos</span>
      </header>

      {/* Main */}
      <main className="flex flex-1 items-center justify-between px-16 py-12">
        {/* Left content */}
        <div className="flex max-w-sm flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#E63B2E]/30 bg-[#FFF0EF] px-3 py-1 text-xs font-medium text-[#E63B2E]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E63B2E]" />
            ERRO 404
          </span>

          <div>
            <h1 className="text-4xl font-black leading-tight text-[#111111]">
              Ops! Esta página
            </h1>
            <h1 className="text-4xl font-black leading-tight text-[#E63B2E]">não existe.</h1>
          </div>

          <p className="text-sm leading-relaxed text-gray-500">
            O endereço que você tentou acessar não foi encontrado, pode ter sido removido ou
            nunca existiu. Não se preocupe, use os atalhos abaixo para voltar aos trilhos.
          </p>

          <nav className="flex flex-col gap-2" aria-label="Atalhos de navegação">
            <NavLink href="/login" icon={<HouseIcon className="text-gray-400" />} label="Início / Login" />
            <NavLink href="/forgot-password" icon={<KeyIcon className="text-gray-400" />} label="Recuperar senha" />
            <NavLink href="/first-access" icon={<FirstAccessIcon className="text-gray-400" />} label="Primeiro acesso" />
          </nav>

          <p className="text-xs text-gray-400">
            Problema técnico?{' '}
            <a
              href="mailto:suporte@shineray.com.br"
              className="font-medium text-[#E63B2E] hover:underline"
            >
              suporte@shineray.com.br
            </a>
          </p>
        </div>

        {/* Right decorative illustration */}
        <div className="relative hidden select-none lg:flex lg:items-center lg:justify-center">
          <span
            aria-hidden="true"
            className="text-[220px] font-black leading-none tracking-tighter text-[#E63B2E]/10"
          >
            404
          </span>

          {/* Floating card */}
          <div className="absolute flex flex-col items-center justify-center rounded-3xl border border-[#F5C6C4]/60 bg-white p-8 shadow-xl shadow-[#E63B2E]/5">
            <div className="relative">
              <Image
                src="/icons/shineray-icon.png"
                alt="Shineray"
                width={80}
                height={80}
                className="h-auto"
              />
              <span className="absolute -right-3 -top-3 flex h-7 w-12 items-center justify-center rounded-full bg-[#E63B2E] text-xs font-bold text-white">
                404
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between border-t border-gray-100 px-8 py-4 text-xs text-gray-400">
        <span>© 2026 Shineray Brasil. Todos os direitos reservados.</span>
        <div className="flex gap-4">
          <Link href="/login" className="hover:text-gray-600">
            Login
          </Link>
          <Link href="/terms" className="hover:text-gray-600">
            Termos e Privacidade
          </Link>
        </div>
      </footer>
    </div>
  );
}

function NavLink({
  href,
  icon,
  label,
}: {
  readonly href: string;
  readonly icon: React.ReactNode;
  readonly label: string;
}): React.JSX.Element {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm font-medium text-[#111111] shadow-sm transition-colors hover:border-gray-200 hover:bg-gray-50"
    >
      <span className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-50">
          {icon}
        </span>
        {label}
      </span>
      <ChevronRight className="h-4 w-4 text-gray-300" />
    </Link>
  );
}
