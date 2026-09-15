import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/layout/admin-shell';
import type { UserProfileDto } from '@/lib/auth.types';
import { UserRole } from '@compliance/shared';

async function getCurrentUser(): Promise<UserProfileDto | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;

  try {
    const res = await fetch(
      `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/v1/auth/me`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    return res.json() as Promise<UserProfileDto>;
  } catch {
    return null;
  }
}

export default async function AdminLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) redirect('/login');

  // Students should not access the admin area
  if (user.role === UserRole.STUDENT) redirect('/student');

  return <AdminShell user={user}>{children}</AdminShell>;
}
