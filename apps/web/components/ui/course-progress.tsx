interface CourseProgressProps {
  readonly percentage: number;
  readonly showLabel?: boolean;
  readonly size?: 'sm' | 'md';
}

export function CourseProgress({
  percentage,
  showLabel = true,
  size = 'md',
}: CourseProgressProps): React.JSX.Element {
  const pct = Math.min(100, Math.max(0, Math.round(percentage)));
  const barHeight = size === 'sm' ? 'h-1.5' : 'h-2';

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progresso</span>
          <span className="font-medium">{pct}%</span>
        </div>
      )}
      <div
        className={`w-full overflow-hidden rounded-full bg-secondary ${barHeight}`}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progresso: ${pct}%`}
      >
        <div
          className={`${barHeight} rounded-full bg-primary transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
