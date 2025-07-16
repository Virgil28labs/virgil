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
      data-testid="skeleton-loader"
      aria-hidden="true"
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

