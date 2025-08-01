import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, buttonVariants } from '../button';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-violet-600');
    expect(button).toHaveClass('h-9');
  });

  describe('variants', () => {
    it('renders default variant', () => {
      render(<Button variant="default">Default</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-violet-600');
      expect(button).toHaveClass('text-white');
    });

    it('renders secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-700');
      expect(button).toHaveClass('text-gray-100');
    });

    it('renders outline variant', () => {
      render(<Button variant="outline">Outline</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border');
      expect(button).toHaveClass('border-gray-600');
      expect(button).toHaveClass('bg-transparent');
    });

    it('renders ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-gray-200');
      expect(button).not.toHaveClass('border');
    });
  });

  describe('sizes', () => {
    it('renders default size', () => {
      render(<Button size="default">Default</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9');
      expect(button).toHaveClass('px-4');
      expect(button).toHaveClass('py-2');
    });

    it('renders small size', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-8');
      expect(button).toHaveClass('px-3');
      expect(button).toHaveClass('text-xs');
    });

    it('renders large size', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10');
      expect(button).toHaveClass('px-8');
    });

    it('renders icon size', () => {
      render(<Button size="icon" aria-label="Icon button">🎯</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9');
      expect(button).toHaveClass('w-9');
    });
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
    // Should still have default classes
    expect(button).toHaveClass('bg-violet-600');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:pointer-events-none');
    expect(button).toHaveClass('disabled:opacity-50');

    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Button with ref</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe('Button with ref');
  });

  it('passes through HTML button attributes', () => {
    render(
      <Button
        type="submit"
        name="test-button"
        value="test-value"
        form="test-form"
      >
        Submit
      </Button>,
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveAttribute('name', 'test-button');
    expect(button).toHaveAttribute('value', 'test-value');
    expect(button).toHaveAttribute('form', 'test-form');
  });

  it('has proper accessibility classes', () => {
    render(<Button>Accessible</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('outline-none');
    expect(button).toHaveClass('focus-visible:ring-2');
    expect(button).toHaveClass('focus-visible:ring-offset-2');
  });

  it('combines variant and size correctly', () => {
    render(
      <Button variant="secondary" size="lg">
        Secondary Large
      </Button>,
    );

    const button = screen.getByRole('button');
    // Secondary variant classes
    expect(button).toHaveClass('bg-gray-700');
    expect(button).toHaveClass('text-gray-100');
    // Large size classes
    expect(button).toHaveClass('h-10');
    expect(button).toHaveClass('px-8');
  });

  it('has display name for dev tools', () => {
    expect(Button.displayName).toBe('Button');
  });
});

describe('buttonVariants', () => {
  it('generates correct classes for variant combinations', () => {
    expect(buttonVariants({ variant: 'default', size: 'default' })).toContain('bg-violet-600');
    expect(buttonVariants({ variant: 'secondary', size: 'sm' })).toContain('bg-gray-700');
    expect(buttonVariants({ variant: 'outline', size: 'lg' })).toContain('border-gray-600');
    expect(buttonVariants({ variant: 'ghost', size: 'icon' })).toContain('text-gray-200');
  });

  it('uses default values when not specified', () => {
    const classes = buttonVariants({});
    expect(classes).toContain('bg-violet-600'); // default variant
    expect(classes).toContain('h-9'); // default size
  });
});
