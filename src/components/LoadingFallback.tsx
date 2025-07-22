import { memo } from 'react';
import { SkeletonLoader } from './SkeletonLoader';

interface LoadingFallbackProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'spinner' | 'skeleton' | 'dots' | 'minimal';
}

export const LoadingFallback = memo(function LoadingFallback({ 
  message = 'Loading...', 
  size = 'medium',
  variant = 'spinner',
}: LoadingFallbackProps) {
  if (variant === 'skeleton') {
    const skeletonCount = size === 'small' ? 1 : size === 'medium' ? 3 : 5;
    return (
      <div 
        className={`loading-fallback ${size}`}
        role="status"
        aria-live="polite"
        aria-label={message}
        style={{ padding: '1rem' }}
      >
        {Array.from({ length: skeletonCount }, (_, i) => (
          <SkeletonLoader 
            key={i}
            height={i === 0 ? '40px' : '20px'}
            width={i === skeletonCount - 1 ? '60%' : '100%'}
            className="skeleton-line"
          />
        ))}
      </div>
    );
  }

  if (variant === 'dots') {
    return (
      <div 
        className={`loading-fallback ${size}`}
        role="status"
        aria-live="polite"
        aria-label={message}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          color: 'var(--brand-light-gray)',
          fontSize: '0.875rem',
        }}
      >
        <div className="loading-dots" style={{ display: 'flex', gap: '4px', marginRight: '0.5rem' }}>
          {[0, 1, 2].map(i => (
            <div 
              key={i}
              className="dot"
              style={{
                width: size === 'small' ? '4px' : size === 'medium' ? '8px' : '12px',
                height: size === 'small' ? '4px' : size === 'medium' ? '8px' : '12px',
                borderRadius: '50%',
                backgroundColor: 'var(--brand-light-purple)',
                animation: `dot-pulse 1.4s ease-in-out ${i * 0.16}s infinite both`,
              }}
            />
          ))}
        </div>
        {message}
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div 
        className={`loading-fallback ${size}`}
        role="status"
        aria-live="polite"
        aria-label={message}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          color: 'var(--brand-light-gray)',
          fontSize: '0.875rem',
        }}
      >
        {message}
      </div>
    );
  }

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8', 
    large: 'w-12 h-12',
  };

  return (
    <div 
      className={`loading-fallback ${size}`}
      role="status"
      aria-live="polite"
      aria-label={message}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        color: 'var(--brand-light-gray)',
        fontSize: '0.875rem',
      }}
    >
      <div 
        className={`spinner ${sizeClasses[size]}`}
        style={{
          width: size === 'small' ? '16px' : size === 'medium' ? '32px' : '48px',
          height: size === 'small' ? '16px' : size === 'medium' ? '32px' : '48px',
          border: '2px solid var(--brand-light-purple)',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginRight: '0.5rem',
        }}
      />
      {message}
    </div>
  );
});