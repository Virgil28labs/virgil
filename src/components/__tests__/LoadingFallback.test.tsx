import { render, screen } from '@testing-library/react';
import { LoadingFallback } from '../LoadingFallback';

describe('LoadingFallback', () => {
  it('renders with default props', () => {
    render(<LoadingFallback />);

    const container = screen.getByText('Loading...').closest('.loading-fallback');
    expect(container).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingFallback message="Loading user data..." />);

    expect(screen.getByText('Loading user data...')).toBeInTheDocument();
  });

  it('applies size classes correctly', () => {
    const sizes = ['small', 'medium', 'large'] as const;

    sizes.forEach(size => {
      const { container } = render(<LoadingFallback size={size} />);
      const fallback = container.querySelector('.loading-fallback');
      expect(fallback).toHaveClass(size);
      container.remove();
    });
  });

  it('renders spinner variant', () => {
    const { container } = render(<LoadingFallback variant="spinner" />);

    const spinner = container.querySelector('.spinner');
    expect(spinner).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders skeleton variant', () => {
    render(<LoadingFallback variant="skeleton" />);

    const skeletons = screen.getAllByTestId('skeleton-loader');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders dots variant', () => {
    const { container } = render(<LoadingFallback variant="dots" />);

    const dots = container.querySelector('.loading-dots');
    expect(dots).toBeInTheDocument();

    // Should have 3 dots
    const dotElements = dots?.querySelectorAll('.dot');
    expect(dotElements).toHaveLength(3);
  });

  it('renders minimal variant', () => {
    render(<LoadingFallback variant="minimal" />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    // Minimal variant should not have spinner or other elements
    expect(screen.queryByTestId('skeleton-loader')).not.toBeInTheDocument();
  });

  it('combines size and variant props correctly', () => {
    const { container } = render(
      <LoadingFallback
        size="large"
        variant="spinner"
        message="Loading large content..."
      />,
    );

    const fallback = container.querySelector('.loading-fallback');
    expect(fallback).toHaveClass('large');
    expect(container.querySelector('.spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading large content...')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    const { container } = render(<LoadingFallback message="Loading data..." />);

    const fallback = container.querySelector('.loading-fallback');
    expect(fallback).toHaveAttribute('role', 'status');
    expect(fallback).toHaveAttribute('aria-live', 'polite');
    expect(fallback).toHaveAttribute('aria-label', 'Loading data...');
  });

  it('renders skeleton variant with multiple skeleton loaders', () => {
    render(<LoadingFallback variant="skeleton" size="large" />);

    const skeletons = screen.getAllByTestId('skeleton-loader');
    expect(skeletons.length).toBe(5); // large size shows 5 skeletons
  });

  it('applies correct classes for all combinations', () => {
    const combinations = [
      { size: 'small', variant: 'spinner' },
      { size: 'medium', variant: 'dots' },
      { size: 'large', variant: 'skeleton' },
    ] as const;

    combinations.forEach(({ size, variant }) => {
      const { container } = render(
        <LoadingFallback size={size} variant={variant} />,
      );

      const fallback = container.querySelector('.loading-fallback');
      expect(fallback).toHaveClass(size);

      if (variant === 'spinner') {
        expect(container.querySelector('.spinner')).toBeInTheDocument();
      } else if (variant === 'dots') {
        expect(container.querySelector('.loading-dots')).toBeInTheDocument();
      } else if (variant === 'skeleton') {
        expect(screen.getAllByTestId('skeleton-loader').length).toBeGreaterThan(0);
      }

      container.remove();
    });
  });

  it('does not render message when variant is skeleton', () => {
    render(<LoadingFallback variant="skeleton" message="This should not appear" />);

    expect(screen.queryByText('This should not appear')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('skeleton-loader').length).toBeGreaterThan(0);
  });
});
