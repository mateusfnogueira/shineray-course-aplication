import { cn } from '@/lib/utils';

interface CourseProgressProps {
  percentage: number;
  size?: 'sm' | 'md';
  className?: string;
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function CourseProgress({ percentage, size = 'md', className }: CourseProgressProps): React.JSX.Element {
  const progress = clampProgress(percentage);

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Progresso</span>
        <span className="font-medium">{progress}%</span>
      </div>
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-muted',
          size === 'sm' ? 'h-1.5' : 'h-2',
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-label="Progresso do curso"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
