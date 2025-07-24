import { render, screen } from '@testing-library/react';
import { Skeleton } from '../skeleton';

describe('Skeleton Component', () => {
  it('renders with default styling', () => {
    render(<Skeleton />);
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('data-slot', 'skeleton');
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('rounded-md');
    expect(skeleton).toHaveStyle({ backgroundColor: '#b3b3b3' });
  });

  it('applies custom className', () => {
    render(<Skeleton className="custom-skeleton h-4 w-full" />);
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveClass('custom-skeleton');
    expect(skeleton).toHaveClass('h-4');
    expect(skeleton).toHaveClass('w-full');
    // Should still have default classes
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('rounded-md');
  });

  it('passes through HTML attributes', () => {
    render(
      <Skeleton 
        id="loading-skeleton"
        role="progressbar"
        aria-label="Loading content"
        style={{ margin: '10px', backgroundColor: '#b3b3b3' }}
      />
    );
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveAttribute('id', 'loading-skeleton');
    expect(skeleton).toHaveAttribute('role', 'progressbar');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading content');
    expect(skeleton).toHaveStyle({ margin: '10px', backgroundColor: '#b3b3b3' });
  });

  it('renders as a div element', () => {
    render(<Skeleton />);
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton.tagName).toBe('DIV');
  });

  it('can render with children', () => {
    render(
      <Skeleton>
        <span className="sr-only">Loading...</span>
      </Skeleton>
    );
    
    const skeleton = screen.getByTestId('skeleton-loader');
    const srText = screen.getByText('Loading...');
    expect(skeleton).toContainElement(srText);
    expect(srText).toHaveClass('sr-only');
  });

  it('supports different sizes through className', () => {
    const { rerender } = render(<Skeleton className="h-4 w-24" />);
    
    let skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveClass('h-4');
    expect(skeleton).toHaveClass('w-24');
    
    rerender(<Skeleton className="h-12 w-12 rounded-full" />);
    
    skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveClass('h-12');
    expect(skeleton).toHaveClass('w-12');
    expect(skeleton).toHaveClass('rounded-full');
  });

  it('can be used for different content types', () => {
    render(
      <div>
        {/* Text skeleton */}
        <Skeleton className="h-4 w-32" />
        
        {/* Avatar skeleton */}
        <Skeleton className="h-10 w-10 rounded-full" />
        
        {/* Card skeleton */}
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
    
    const skeletons = screen.getAllByTestId('skeleton-loader');
    expect(skeletons[0]).toHaveClass('h-4', 'w-32');
    expect(skeletons[1]).toHaveClass('h-10', 'w-10', 'rounded-full');
    expect(skeletons[2]).toHaveClass('h-32', 'w-full', 'rounded-lg');
  });

  it('maintains animation class for loading effect', () => {
    render(<Skeleton />);
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('has consistent background color', () => {
    render(<Skeleton />);
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveStyle({ backgroundColor: '#b3b3b3' });
  });

  it('can override styles with inline styles', () => {
    render(
      <Skeleton 
        style={{ 
          backgroundColor: '#e0e0e0',
          height: '50px',
          width: '200px' 
        }} 
      />
    );
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveStyle({ 
      backgroundColor: '#e0e0e0',
      height: '50px',
      width: '200px'
    });
  });
});

describe('Skeleton usage patterns', () => {
  it('works in a loading state for text', () => {
    const isLoading = true;
    
    render(
      <div>
        {isLoading ? (
          <Skeleton className="h-4 w-48" />
        ) : (
          <p>Loaded text content</p>
        )}
      </div>
    );
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('h-4', 'w-48');
  });

  it('works for multiple skeleton items', () => {
    render(
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
    
    const skeletons = screen.getAllByTestId('skeleton-loader');
    expect(skeletons).toHaveLength(3);
    expect(skeletons[0]).toHaveClass('w-full');
    expect(skeletons[1]).toHaveClass('w-3/4');
    expect(skeletons[2]).toHaveClass('w-1/2');
  });

  it('works in a card layout', () => {
    render(
      <div className="card">
        <Skeleton className="h-48 w-full rounded-t-lg" />
        <div className="p-4 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
    
    const skeletons = screen.getAllByTestId('skeleton-loader');
    expect(skeletons).toHaveLength(4);
    expect(skeletons[0]).toHaveClass('h-48', 'rounded-t-lg');
    expect(skeletons[1]).toHaveClass('h-6');
  });

  it('has proper data attributes for styling hooks', () => {
    render(<Skeleton />);
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveAttribute('data-slot', 'skeleton');
    expect(skeleton).toHaveAttribute('data-testid', 'skeleton-loader');
  });
});