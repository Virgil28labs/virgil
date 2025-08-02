import React from 'react';
import { cn } from '../../lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      data-testid="skeleton-loader"
      className={cn('skeleton rounded-md', className)}
      {...props}
    />
  );
}

export { Skeleton };
