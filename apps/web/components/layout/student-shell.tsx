'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  AlertCircle,
  PlayCircle,
  CheckCircle2,
  Heart,
  LogOut,
  Menu,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserProfileDto } from '@/lib/auth.types';
import { logout } from '@/lib/auth';

const navItems = [
  { href: '/student', label: 'Início', icon: LayoutDashboard, exact: true },
  { href: '/student/catalog', label: 'Catálogo', icon: BookOpen },
  { href: '/student/courses/required', label: 'Obrigatórios', icon: AlertCircle },
  { href: '/student/courses/in-progress', label: 'Em andamento', icon: PlayCircle },
  { href: '/student/courses/completed', label: 'Concluídos', icon: CheckCircle2 },
  { href: '/student/favorites', label: 'Favoritos', icon: Heart },
];

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).slice(0, 2);
  return words.map((word) => word[0]?.toUpperCase() ?? '').join('') || 'U';
}

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
  collapsed,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  collapsed: boolean;
}): React.JSX.Element {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        collapsed ? 'justify-center px-0' : 'justify-start',
        isActive
          ? 'bg-red-600 text-white'
          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function StudentShell({
  user,
  children,
}: {
  readonly user: UserProfileDto;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  async function handleLogout(): Promise<void> {
    await logout().catch(() => undefined);
    router.push('/login');
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white">
      {/* Logo — clique abre/fecha o sidebar */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setSidebarOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSidebarOpen((prev) => !prev);
          }
        }}
        aria-label="Alternar menu lateral"
        className={cn(
          'flex h-16 cursor-pointer select-none items-center border-b border-neutral-200 px-3 transition-colors hover:bg-neutral-50',
          sidebarOpen ? 'justify-between' : 'justify-center',
        )}
      >
        {sidebarOpen ? (
          <Image
            src="/images/shineray-logo-menu-header.png"
            alt="Shineray"
            width={110}
            height={24}
            className="h-6 w-auto object-contain"
          />
        ) : (
          <Image
            src="/images/shineray-icon-with-border.png"
            alt="Shineray"
            width={30}
            height={30}
            className="h-7 w-7 object-contain"
          />
        )}
      </div>

      {/* Navegação */}
      <nav
        className={cn('flex-1 space-y-0.5 py-3', sidebarOpen ? 'px-3' : 'px-2')}
        aria-label="Navegação do aluno"
      >
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} collapsed={!sidebarOpen} />
        ))}
      </nav>

      {/* Sair */}
      <div className={cn('border-t border-neutral-200 py-3', sidebarOpen ? 'px-3' : 'px-2')}>
        <button
          onClick={() => { void handleLogout(); }}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900',
            !sidebarOpen && 'justify-center px-0',
          )}
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          {sidebarOpen && 'Sair'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-neutral-100">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden shrink-0 border-r border-neutral-200 bg-white transition-all duration-200 lg:block',
          sidebarOpen ? 'w-60' : 'w-16',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 border-r border-neutral-200 bg-white transition-transform duration-200 lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center gap-4 border-b border-neutral-200 bg-white px-4 shadow-sm">
          {/* Mobile: botão de menu */}
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>

          <div className="flex-1" />

          {/* Notificações */}
          <button
            className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" aria-hidden />
          </button>

          {/* Informações do usuário */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
              {getInitials(user.name)}
            </div>
            <div className="hidden flex-col text-left sm:flex">
              <span className="text-sm font-semibold leading-tight text-neutral-900">
                {user.name}
              </span>
              <span className="text-xs leading-tight text-neutral-500">{user.email}</span>
              <span className="text-[11px] font-semibold leading-tight text-red-600 uppercase tracking-wide">
                {user.position ?? 'Aluno'}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
