import { Badge } from '@compliance/ui';
import { CourseStatus } from '@compliance/shared';

const STATUS_CONFIG: Record<CourseStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'success' | 'warning' }> = {
  [CourseStatus.DRAFT]: { label: 'Rascunho', variant: 'secondary' },
  [CourseStatus.PUBLISHED]: { label: 'Publicado', variant: 'success' },
  [CourseStatus.ARCHIVED]: { label: 'Arquivado', variant: 'outline' },
};

export function CourseStatusBadge({ status }: { readonly status: CourseStatus | string }): React.JSX.Element {
  const config = STATUS_CONFIG[status as CourseStatus] ?? { label: status, variant: 'secondary' as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
