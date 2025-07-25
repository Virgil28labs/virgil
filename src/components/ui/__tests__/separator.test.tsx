import { render, screen } from '@testing-library/react';
import { Separator } from '../separator';

// Mock Radix UI Separator
jest.mock('@radix-ui/react-separator', () => ({
  Root: ({ decorative, orientation = 'horizontal', className, ...props }: any) => (
    <div
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      data-orientation={orientation}
      className={className}
      {...props}
    />
  ),
}));

describe('Separator Component', () => {
  it('renders with default props', () => {
    render(<Separator data-testid="separator" />);
    
    const separator = screen.getByTestId('separator');
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute('role', 'none'); // decorative by default
    expect(separator).toHaveAttribute('data-orientation', 'horizontal');
    expect(separator).toHaveClass('shrink-0');
    expect(separator).toHaveClass('bg-border');
    expect(separator).toHaveClass('data-[orientation=horizontal]:h-[1px]');
    expect(separator).toHaveClass('data-[orientation=horizontal]:w-full');
  });

  describe('orientation', () => {
    it('renders horizontal separator', () => {
      render(<Separator orientation="horizontal" data-testid="separator" />);
      
      const separator = screen.getByTestId('separator');
      expect(separator).toHaveAttribute('data-orientation', 'horizontal');
      expect(separator).toHaveClass('data-[orientation=horizontal]:h-[1px]');
      expect(separator).toHaveClass('data-[orientation=horizontal]:w-full');
    });

    it('renders vertical separator', () => {
      render(<Separator orientation="vertical" data-testid="separator" />);
      
      const separator = screen.getByTestId('separator');
      expect(separator).toHaveAttribute('data-orientation', 'vertical');
      expect(separator).toHaveClass('data-[orientation=vertical]:h-full');
      expect(separator).toHaveClass('data-[orientation=vertical]:w-[1px]');
    });
  });

  describe('decorative prop', () => {
    it('renders as decorative (default)', () => {
      render(<Separator data-testid="separator" />);
      
      const separator = screen.getByTestId('separator');
      expect(separator).toHaveAttribute('role', 'none');
      expect(separator).not.toHaveAttribute('aria-orientation');
    });

    it('renders as non-decorative', () => {
      render(<Separator decorative={false} data-testid="separator" />);
      
      const separator = screen.getByTestId('separator');
      expect(separator).toHaveAttribute('role', 'separator');
      expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
    });

    it('includes aria-orientation for non-decorative vertical separator', () => {
      render(
        <Separator 
          decorative={false} 
          orientation="vertical" 
          data-testid="separator" 
        />,
      );
      
      const separator = screen.getByTestId('separator');
      expect(separator).toHaveAttribute('role', 'separator');
      expect(separator).toHaveAttribute('aria-orientation', 'vertical');
    });
  });

  it('applies custom className', () => {
    render(<Separator className="custom-separator" data-testid="separator" />);
    
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('custom-separator');
    // Should still have default classes
    expect(separator).toHaveClass('shrink-0');
    expect(separator).toHaveClass('bg-border');
  });

  it('passes through HTML attributes', () => {
    render(
      <Separator 
        id="test-separator"
        data-testid="separator"
        style={{ margin: '20px' }}
      />,
    );
    
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('id', 'test-separator');
    expect(separator).toHaveStyle({ margin: '20px' });
  });

  it('has all base styling classes', () => {
    render(<Separator data-testid="separator" />);
    
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveClass('shrink-0');
    expect(separator).toHaveClass('bg-border');
    expect(separator).toHaveClass('data-[orientation=horizontal]:h-[1px]');
    expect(separator).toHaveClass('data-[orientation=horizontal]:w-full');
    expect(separator).toHaveClass('data-[orientation=vertical]:h-full');
    expect(separator).toHaveClass('data-[orientation=vertical]:w-[1px]');
  });
});

describe('Separator in different contexts', () => {
  it('works in a horizontal layout', () => {
    render(
      <div>
        <div>Content above</div>
        <Separator data-testid="separator" />
        <div>Content below</div>
      </div>,
    );
    
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('works in a vertical layout', () => {
    render(
      <div style={{ display: 'flex' }}>
        <div>Left content</div>
        <Separator orientation="vertical" data-testid="separator" />
        <div>Right content</div>
      </div>,
    );
    
    const separator = screen.getByTestId('separator');
    expect(separator).toHaveAttribute('data-orientation', 'vertical');
  });

  it('can be used multiple times', () => {
    render(
      <div>
        <div>Section 1</div>
        <Separator data-testid="separator-1" />
        <div>Section 2</div>
        <Separator data-testid="separator-2" />
        <div>Section 3</div>
      </div>,
    );
    
    const separator1 = screen.getByTestId('separator-1');
    const separator2 = screen.getByTestId('separator-2');
    
    expect(separator1).toBeInTheDocument();
    expect(separator2).toBeInTheDocument();
    expect(separator1).toHaveClass('bg-border');
    expect(separator2).toHaveClass('bg-border');
  });

  it('works with custom styling for different themes', () => {
    render(
      <div>
        <Separator className="bg-gray-200" data-testid="light-separator" />
        <Separator className="bg-gray-800" data-testid="dark-separator" />
      </div>,
    );
    
    const lightSeparator = screen.getByTestId('light-separator');
    const darkSeparator = screen.getByTestId('dark-separator');
    
    expect(lightSeparator).toHaveClass('bg-gray-200');
    expect(darkSeparator).toHaveClass('bg-gray-800');
  });
});