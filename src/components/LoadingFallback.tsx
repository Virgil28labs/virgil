import { memo } from 'react';
import { SkeletonLoader } from './SkeletonLoader';

interface LoadingFallbackProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'skeleton';
}

export const LoadingFallback = memo(function LoadingFallback({ 
  message = 'Loading...', 
  size = 'medium',
  variant = 'spinner'
}: LoadingFallbackProps) {
  if (variant === 'skeleton') {
    const skeletonHeight = size === 'small' ? '60px' : size === 'medium' ? '120px' : '180px';
    return (
      <div className="loading-fallback" style={{ padding: '1rem' }}>
        <SkeletonLoader height={skeletonHeight} />
      </div>
    );
  }

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8', 
    large: 'w-12 h-12'
  };

  return (
    <div className="loading-fallback" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      color: 'var(--brand-light-gray)',
      fontSize: '0.875rem'
    }}>
      <div 
        className={`loading-spinner ${sizeClasses[size]}`}
        style={{
          width: size === 'small' ? '16px' : size === 'medium' ? '32px' : '48px',
          height: size === 'small' ? '16px' : size === 'medium' ? '32px' : '48px',
          border: '2px solid var(--brand-light-purple)',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginRight: '0.5rem'
        }}
      />
      {message}
    </div>
  );
});