import { render, screen } from '@testing-library/react';
import { SkeletonLoader } from './SkeletonLoader';

describe('SkeletonLoader', () => {
  it('renders with default props', () => {
    render(<SkeletonLoader />);
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('skeleton-loader');
  });

  it('applies custom width', () => {
    render(<SkeletonLoader width="200px" />);
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveStyle({ width: '200px' });
  });

  it('applies custom height', () => {
    render(<SkeletonLoader height="50px" />);
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveStyle({ height: '50px' });
  });

  it('applies custom border radius', () => {
    render(<SkeletonLoader borderRadius="12px" />);
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveStyle({ borderRadius: '12px' });
  });

  it('applies all custom styles together', () => {
    render(
      <SkeletonLoader 
        width="300px" 
        height="100px" 
        borderRadius="8px" 
      />,
    );
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveStyle({
      width: '300px',
      height: '100px',
      borderRadius: '8px',
    });
  });

  it('uses percentage values correctly', () => {
    render(<SkeletonLoader width="50%" height="80%" />);
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveStyle({
      width: '50%',
      height: '80%',
    });
  });

  it('uses default values when no props provided', () => {
    render(<SkeletonLoader />);
    
    const skeleton = screen.getByTestId('skeleton-loader');
    const styles = window.getComputedStyle(skeleton);
    
    // Should have some default values
    expect(styles.width).toBeTruthy();
    expect(styles.height).toBeTruthy();
  });

  it('has aria-hidden for accessibility', () => {
    render(<SkeletonLoader />);
    
    const skeleton = screen.getByTestId('skeleton-loader');
    expect(skeleton).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders multiple instances independently', () => {
    const { container } = render(
      <>
        <SkeletonLoader width="100px" height="20px" />
        <SkeletonLoader width="200px" height="40px" />
        <SkeletonLoader width="300px" height="60px" />
      </>,
    );
    
    const skeletons = container.querySelectorAll('.skeleton-loader');
    expect(skeletons).toHaveLength(3);
    
    expect(skeletons[0]).toHaveStyle({ width: '100px', height: '20px' });
    expect(skeletons[1]).toHaveStyle({ width: '200px', height: '40px' });
    expect(skeletons[2]).toHaveStyle({ width: '300px', height: '60px' });
  });
});