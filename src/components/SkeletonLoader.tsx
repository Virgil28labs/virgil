import { memo } from 'react';

interface SkeletonLoaderProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export const SkeletonLoader = memo(function SkeletonLoader({
  width = '100%',
  height = '20px',
  borderRadius = '4px',
  className = ''
}: SkeletonLoaderProps) {
  return (
    <div
      className={`skeleton-loader ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--brand-dark-purple) 25%, var(--brand-light-purple) 50%, var(--brand-dark-purple) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-loading 1.5s infinite'
      }}
    />
  );
});

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText = memo(function SkeletonText({
  lines = 1,
  className = ''
}: SkeletonTextProps) {
  return (
    <div className={className}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLoader
          key={i}
          height="16px"
          width={i === lines - 1 ? '75%' : '100%'}
          borderRadius="2px"
          className="skeleton-text-line"
        />
      ))}
    </div>
  );
});

interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard = memo(function SkeletonCard({
  className = ''
}: SkeletonCardProps) {
  return (
    <div className={`skeleton-card ${className}`}>
      <SkeletonLoader height="120px" borderRadius="8px" />
      <div style={{ padding: '1rem 0' }}>
        <SkeletonText lines={2} />
      </div>
    </div>
  );
});