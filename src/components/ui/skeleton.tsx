import React from 'react';
import { cn } from '../../lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      data-testid="skeleton-loader"
      className={cn('animate-pulse rounded-md', className)}
      style={{ backgroundColor: '#b3b3b3' }}
      {...props}
    />
  );
}

export { Skeleton };