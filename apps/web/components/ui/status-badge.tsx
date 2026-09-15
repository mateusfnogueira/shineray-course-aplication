import { Badge } from '@compliance/ui';
import { UserStatus } from '@compliance/shared';

const STATUS_CONFIG: Record<
  UserStatus,
  { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'info' }
> = {
  [UserStatus.ACTIVE]: { label: 'Ativo', variant: 'success' },
  [UserStatus.INVITED]: { label: 'Convidado', variant: 'info' },
  [UserStatus.INACTIVE]: { label: 'Inativo', variant: 'secondary' },
  [UserStatus.BLOCKED]: { label: 'Bloqueado', variant: 'destructive' },
};

interface StatusBadgeProps {
  readonly status: UserStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps): React.JSX.Element {
  const config = STATUS_CONFIG[status as UserStatus] ?? { label: status, variant: 'secondary' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface StoreBadgeProps {
  readonly active: boolean;
}

export function StoreStatusBadge({ active }: StoreBadgeProps): React.JSX.Element {
  return (
    <Badge variant={active ? 'success' : 'secondary'}>{active ? 'Ativa' : 'Inativa'}</Badge>
  );
}
