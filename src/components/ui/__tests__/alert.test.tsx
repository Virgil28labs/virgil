import { render, screen } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from '../alert';

describe('Alert Component', () => {
  it('renders with default variant', () => {
    render(<Alert>Default alert content</Alert>);
    
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Default alert content');
    expect(alert).toHaveClass('bg-background');
    expect(alert).toHaveClass('text-foreground');
    expect(alert).toHaveClass('border-border');
  });

  describe('variants', () => {
    it('renders destructive variant', () => {
      render(<Alert variant="destructive">Error message</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-red-200');
      expect(alert).toHaveClass('text-red-800');
      expect(alert).toHaveClass('bg-red-50');
    });

    it('renders info variant', () => {
      render(<Alert variant="info">Info message</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-blue-200');
      expect(alert).toHaveClass('text-blue-800');
      expect(alert).toHaveClass('bg-blue-50');
    });

    it('renders success variant', () => {
      render(<Alert variant="success">Success message</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-green-200');
      expect(alert).toHaveClass('text-green-800');
      expect(alert).toHaveClass('bg-green-50');
    });

    it('renders warning variant', () => {
      render(<Alert variant="warning">Warning message</Alert>);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveClass('border-yellow-200');
      expect(alert).toHaveClass('text-yellow-800');
      expect(alert).toHaveClass('bg-yellow-50');
    });
  });

  it('applies custom className', () => {
    render(<Alert className="custom-alert">Custom alert</Alert>);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('custom-alert');
    // Should still have default classes
    expect(alert).toHaveClass('relative');
    expect(alert).toHaveClass('rounded-lg');
  });

  it('passes through HTML attributes', () => {
    render(
      <Alert 
        data-testid="test-alert"
        id="my-alert"
        style={{ margin: '10px' }}
      >
        Alert with attributes
      </Alert>,
    );
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-testid', 'test-alert');
    expect(alert).toHaveAttribute('id', 'my-alert');
    expect(alert).toHaveStyle({ margin: '10px' });
  });

  it('renders with children elements', () => {
    render(
      <Alert>
        <svg className="icon">Icon</svg>
        <span>Alert text</span>
      </Alert>,
    );
    
    const alert = screen.getByRole('alert');
    expect(alert).toContainHTML('<svg');
    expect(alert).toContainHTML('<span>Alert text</span>');
  });
});

describe('AlertTitle Component', () => {
  it('renders title with proper styling', () => {
    render(<AlertTitle>Alert Title</AlertTitle>);
    
    const title = screen.getByText('Alert Title');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('font-medium');
    expect(title).toHaveClass('tracking-tight');
    expect(title).toHaveClass('leading-none');
    expect(title).toHaveClass('mb-1');
  });

  it('applies custom className', () => {
    render(<AlertTitle className="custom-title">Title</AlertTitle>);
    
    const title = screen.getByText('Title');
    expect(title).toHaveClass('custom-title');
    expect(title).toHaveClass('font-medium'); // Still has default classes
  });

  it('passes through HTML attributes', () => {
    render(
      <AlertTitle id="alert-title" data-testid="title">
        Title
      </AlertTitle>,
    );
    
    const title = screen.getByText('Title');
    expect(title).toHaveAttribute('id', 'alert-title');
    expect(title).toHaveAttribute('data-testid', 'title');
  });
});

describe('AlertDescription Component', () => {
  it('renders description with proper styling', () => {
    render(<AlertDescription>Alert description text</AlertDescription>);
    
    const description = screen.getByText('Alert description text');
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('text-sm');
    expect(description).toHaveClass('leading-relaxed');
  });

  it('applies custom className', () => {
    render(
      <AlertDescription className="custom-description">
        Description
      </AlertDescription>,
    );
    
    const description = screen.getByText('Description');
    expect(description).toHaveClass('custom-description');
    expect(description).toHaveClass('text-sm'); // Still has default classes
  });

  it('passes through HTML attributes', () => {
    render(
      <AlertDescription id="alert-desc" data-testid="desc">
        Description
      </AlertDescription>,
    );
    
    const description = screen.getByText('Description');
    expect(description).toHaveAttribute('id', 'alert-desc');
    expect(description).toHaveAttribute('data-testid', 'desc');
  });

  it('renders with nested content', () => {
    render(
      <AlertDescription>
        <strong>Important:</strong> This is a description with{' '}
        <a href="#">a link</a>.
      </AlertDescription>,
    );
    
    const strong = screen.getByText('Important:');
    const link = screen.getByText('a link');
    
    expect(strong).toBeInTheDocument();
    expect(strong.tagName).toBe('STRONG');
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '#');
  });
});

describe('Alert with composed elements', () => {
  it('renders complete alert with title and description', () => {
    render(
      <Alert variant="info">
        <AlertTitle>Information</AlertTitle>
        <AlertDescription>
          This is an informational alert with a title and description.
        </AlertDescription>
      </Alert>,
    );
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-blue-200');
    
    const title = screen.getByText('Information');
    expect(title).toHaveClass('font-medium');
    
    const description = screen.getByText(/This is an informational alert/);
    expect(description).toHaveClass('text-sm');
  });

  it('renders with icon, title, and description', () => {
    render(
      <Alert variant="success">
        <svg data-testid="icon">✓</svg>
        <div>
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>
            Your changes have been saved successfully.
          </AlertDescription>
        </div>
      </Alert>,
    );
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('border-green-200');
    
    const icon = screen.getByTestId('icon');
    expect(icon).toBeInTheDocument();
    
    const title = screen.getByText('Success!');
    const description = screen.getByText(/Your changes have been saved/);
    expect(title).toBeInTheDocument();
    expect(description).toBeInTheDocument();
  });
});