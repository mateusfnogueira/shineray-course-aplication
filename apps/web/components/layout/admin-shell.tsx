'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Store,
  BookOpen,
  BarChart3,
  ScrollText,
  Layers,
  Megaphone,
  Menu,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@compliance/ui';
import { UserRole } from '@compliance/shared';
import type { UserProfileDto } from '@/lib/auth.types';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const navItems = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: [UserRole.MASTER_ADMIN, UserRole.STORE_ADMIN],
    exact: true,
  },
  {
    href: '/admin/users',
    label: 'Usuários',
    icon: Users,
    roles: [UserRole.MASTER_ADMIN, UserRole.STORE_ADMIN],
  },
  {
    href: '/admin/stores',
    label: 'Lojas',
    icon: Store,
    roles: [UserRole.MASTER_ADMIN],
  },
  {
    href: '/admin/courses',
    label: 'Cursos',
    icon: BookOpen,
    roles: [UserRole.MASTER_ADMIN, UserRole.STORE_ADMIN],
  },
  {
    href: '/admin/trails',
    label: 'Trilhas',
    icon: Layers,
    roles: [UserRole.MASTER_ADMIN],
  },
  {
    href: '/admin/announcements',
    label: 'Comunicados',
    icon: Megaphone,
    roles: [UserRole.MASTER_ADMIN],
  },
  {
    href: '/admin/reports',
    label: 'Relatórios',
    icon: BarChart3,
    roles: [UserRole.MASTER_ADMIN, UserRole.STORE_ADMIN],
  },
  {
    href: '/admin/audit',
    label: 'Auditoria',
    icon: ScrollText,
    roles: [UserRole.MASTER_ADMIN],
  },
];

interface AdminSidebarProps {
  readonly user: UserProfileDto;
  readonly open: boolean;
  readonly onClose: () => void;
}

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
      {isActive && <ChevronRight className="ml-auto h-3 w-3" aria-hidden />}
    </Link>
  );
}

export function AdminSidebar({ user, open, onClose }: AdminSidebarProps): React.JSX.Element {
  const router = useRouter();
  const visibleLinks = navItems.filter((item) => item.roles.includes(user.role as UserRole));

  async function handleLogout(): Promise<void> {
    await logout().catch(() => undefined);
    router.push('/login');
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-sidebar px-3 py-4">
      <div className="mb-4 flex items-center justify-between px-1">
        <span className="text-base font-semibold text-sidebar-foreground">
          Compliance Training
        </span>
        <button
          onClick={onClose}
          className="rounded p-1 lg:hidden hover:bg-sidebar-accent"
          aria-label="Fechar menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Separator className="mb-4 bg-sidebar-border" />

      <nav className="flex-1 space-y-1" aria-label="Navegação principal">
        {visibleLinks.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            exact={item.exact}
          />
        ))}
      </nav>

      <Separator className="mt-4 mb-3 bg-sidebar-border" />

      <div className="space-y-1">
        <div className="px-3 py-1">
          <p className="text-xs font-medium text-sidebar-foreground truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <button
          onClick={() => { void handleLogout(); }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label="Sair da plataforma"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden w-56 shrink-0 border-r lg:block"
        aria-label="Barra de navegação"
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-56 border-r transition-transform duration-200 lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Barra de navegação (mobile)"
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export function AdminHeader({
  user,
  onMenuClick,
}: {
  readonly user: UserProfileDto;
  readonly onMenuClick: () => void;
}): React.JSX.Element {
  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4 lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded p-1 hover:bg-accent lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
        <span className="hidden sm:inline">{user.name}</span>
      </div>
    </header>
  );
}

export function AdminShell({
  user,
  children,
}: {
  readonly user: UserProfileDto;
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar
        user={user}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader user={user} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

