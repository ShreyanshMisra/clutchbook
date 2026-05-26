interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  className?: string;
}

export function Skeleton({ width = '100%', height = 16, radius, className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius: radius,
      }}
      aria-hidden
    />
  );
}

/** A pulsing placeholder matching MatchCard dimensions. */
export function MatchCardSkeleton() {
  return (
    <div className="surface" style={{ padding: 16 }} aria-hidden>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <Skeleton width={90} height={20} radius={999} />
        <Skeleton width={60} height={16} radius={999} />
      </div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <Skeleton width="40%" height={22} />
        <Skeleton width={28} height={14} />
        <Skeleton width="40%" height={22} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton height={52} />
        <Skeleton height={52} />
      </div>
    </div>
  );
}
