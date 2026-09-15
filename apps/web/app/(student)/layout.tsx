import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UserRole } from '@compliance/shared';
import { StudentShell } from '@/components/layout/student-shell';
import type { UserProfileDto } from '@/lib/auth.types';

async function getCurrentUser(): Promise<UserProfileDto | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;
  if (!token) return null;
  try {
    const res = await fetch(
      `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/api/v1/auth/me`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
    );
    if (!res.ok) return null;
    return res.json() as Promise<UserProfileDto>;
  } catch {
    return null;
  }
}

export default async function StudentLayout({
  children,
}: {
  readonly children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const user = await getCurrentUser();

  if (!user) redirect('/login');
  if (user.role !== UserRole.STUDENT) redirect('/admin');

  return <StudentShell user={user}>{children}</StudentShell>;
}
