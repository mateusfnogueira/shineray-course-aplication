'use client';

import { useState } from 'react';
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
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@compliance/ui';
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

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}): React.JSX.Element {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
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
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleLogout(): Promise<void> {
    await logout().catch(() => undefined);
    router.push('/login');
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar px-3 py-4">
      <div className="mb-4 flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-sidebar-foreground">Treinamentos</span>
        <button
          onClick={() => setOpen(false)}
          className="rounded p-1 lg:hidden hover:bg-sidebar-accent"
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Separator className="mb-4 bg-sidebar-border" />

      <nav className="flex-1 space-y-1" aria-label="Navegação do aluno">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      <Separator className="mt-4 mb-3 bg-sidebar-border" />

      <div className="space-y-1">
        <div className="px-3 py-1">
          <p className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.position ?? 'Aluno'}</p>
        </div>
        <button
          onClick={() => { void handleLogout(); }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-52 shrink-0 border-r lg:block">{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)} aria-hidden>
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-52 border-r transition-transform duration-200 lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebar}
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-3 border-b bg-background px-4">
          <button
            onClick={() => setOpen(true)}
            className="rounded p-1 hover:bg-accent lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-auto text-sm text-muted-foreground">{user.name}</span>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
