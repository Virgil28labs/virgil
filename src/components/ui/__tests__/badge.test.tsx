import { render, screen } from '@testing-library/react';
import { Badge, badgeVariants } from '../badge';

describe('Badge Component', () => {
  it('renders with default variant', () => {
    render(<Badge>Default Badge</Badge>);

    const badge = screen.getByText('Default Badge');
    expect(badge).toBeInTheDocument();
    expect(badge.tagName).toBe('SPAN');
    expect(badge).toHaveClass('bg-primary');
    expect(badge).toHaveClass('text-primary-foreground');
    expect(badge).toHaveClass('border-transparent');
  });

  describe('variants', () => {
    it('renders secondary variant', () => {
      render(<Badge variant="secondary">Secondary</Badge>);

      const badge = screen.getByText('Secondary');
      expect(badge).toHaveClass('bg-secondary');
      expect(badge).toHaveClass('text-secondary-foreground');
      expect(badge).toHaveClass('border-transparent');
    });

    it('renders destructive variant', () => {
      render(<Badge variant="destructive">Error</Badge>);

      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('bg-destructive');
      expect(badge).toHaveClass('text-white');
      expect(badge).toHaveClass('border-transparent');
    });

    it('renders outline variant', () => {
      render(<Badge variant="outline">Outlined</Badge>);

      const badge = screen.getByText('Outlined');
      expect(badge).toHaveClass('text-foreground');
      expect(badge).toHaveClass('border-gray-300');
      expect(badge).toHaveClass('hover:bg-accent');
    });

    it('renders keyboard variant', () => {
      render(<Badge variant="keyboard">Ctrl</Badge>);

      const badge = screen.getByText('Ctrl');
      expect(badge).toHaveClass('border-gray-300');
      expect(badge).toHaveClass('bg-gray-50');
      expect(badge).toHaveClass('text-gray-700');
      expect(badge).toHaveClass('font-mono');
      expect(badge).toHaveClass('shadow-sm');
    });
  });

  it('applies custom className', () => {
    render(<Badge className="custom-badge">Custom</Badge>);

    const badge = screen.getByText('Custom');
    expect(badge).toHaveClass('custom-badge');
    // Should still have base classes
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('rounded-md');
  });

  it('renders with base styling classes', () => {
    render(<Badge>Styled Badge</Badge>);

    const badge = screen.getByText('Styled Badge');
    expect(badge).toHaveClass('inline-flex');
    expect(badge).toHaveClass('items-center');
    expect(badge).toHaveClass('justify-center');
    expect(badge).toHaveClass('rounded-md');
    expect(badge).toHaveClass('border');
    expect(badge).toHaveClass('px-2');
    expect(badge).toHaveClass('py-0.5');
    expect(badge).toHaveClass('text-xs');
    expect(badge).toHaveClass('font-medium');
    expect(badge).toHaveClass('w-fit');
    expect(badge).toHaveClass('whitespace-nowrap');
  });

  it('passes through HTML attributes', () => {
    render(
      <Badge
        id="test-badge"
        data-testid="badge"
        title="Badge title"
        style={{ margin: '5px' }}
      >
        Badge with attrs
      </Badge>,
    );

    const badge = screen.getByText('Badge with attrs');
    expect(badge).toHaveAttribute('id', 'test-badge');
    expect(badge).toHaveAttribute('data-testid', 'badge');
    expect(badge).toHaveAttribute('title', 'Badge title');
    expect(badge).toHaveStyle({ margin: '5px' });
  });

  it('renders with children elements', () => {
    render(
      <Badge>
        <svg data-testid="icon">★</svg>
        <span>Badge Text</span>
      </Badge>,
    );

    const badge = screen.getByText('Badge Text').closest('span.inline-flex');
    const icon = screen.getByTestId('icon');
    expect(badge).toContainElement(icon);
  });

  it('handles focus state classes', () => {
    render(<Badge>Focusable</Badge>);

    const badge = screen.getByText('Focusable');
    expect(badge).toHaveClass('focus-visible:border-ring');
    expect(badge).toHaveClass('focus-visible:ring-ring/50');
    expect(badge).toHaveClass('focus-visible:ring-[3px]');
  });

  it('has transition classes', () => {
    render(<Badge>Transitioned</Badge>);

    const badge = screen.getByText('Transitioned');
    expect(badge).toHaveClass('transition-[color,box-shadow]');
  });

  it('handles overflow', () => {
    render(<Badge>Very long badge text that might overflow</Badge>);

    const badge = screen.getByText(/Very long badge text/);
    expect(badge).toHaveClass('overflow-hidden');
  });
});

describe('badgeVariants', () => {
  it('generates correct classes for variant combinations', () => {
    expect(badgeVariants({ variant: 'default' })).toContain('bg-primary');
    expect(badgeVariants({ variant: 'secondary' })).toContain('bg-secondary');
    expect(badgeVariants({ variant: 'destructive' })).toContain('bg-destructive');
    expect(badgeVariants({ variant: 'outline' })).toContain('border-gray-300');
    expect(badgeVariants({ variant: 'keyboard' })).toContain('font-mono');
  });

  it('uses default variant when not specified', () => {
    const classes = badgeVariants({});
    expect(classes).toContain('bg-primary');
    expect(classes).toContain('text-primary-foreground');
  });
});
