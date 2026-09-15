import { Badge } from '@compliance/ui';
import { UserRole } from '@compliance/shared';

const ROLE_CONFIG: Record<UserRole, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  [UserRole.MASTER_ADMIN]: { label: 'Master Admin', variant: 'default' },
  [UserRole.STORE_ADMIN]: { label: 'Admin da Loja', variant: 'secondary' },
  [UserRole.STUDENT]: { label: 'Aluno', variant: 'outline' },
};

interface RoleBadgeProps {
  readonly role: UserRole | string;
}

export function RoleBadge({ role }: RoleBadgeProps): React.JSX.Element {
  const config = ROLE_CONFIG[role as UserRole] ?? { label: role, variant: 'outline' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
