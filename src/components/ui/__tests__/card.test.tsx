import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../card';

describe('Card Component', () => {
  it('renders with default styling', () => {
    render(<Card data-testid="card">Card content</Card>);

    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent('Card content');
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('bg-card');
    expect(card).toHaveClass('text-card-foreground');
    expect(card).toHaveClass('shadow-sm');
  });

  it('applies custom className', () => {
    render(<Card className="custom-card" data-testid="custom-card">Custom Card</Card>);

    const card = screen.getByTestId('custom-card');
    expect(card).toHaveClass('custom-card');
    // Should still have default classes
    expect(card).toHaveClass('rounded-lg');
  });

  it('passes through HTML attributes', () => {
    render(
      <Card
        id="test-card"
        data-testid="card"
        role="article"
        style={{ margin: '10px' }}
      >
        Card with attributes
      </Card>,
    );

    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('id', 'test-card');
    expect(card).toHaveAttribute('role', 'article');
    expect(card).toHaveStyle({ margin: '10px' });
  });
});

describe('CardHeader Component', () => {
  it('renders with proper styling', () => {
    render(<CardHeader data-testid="header">Header content</CardHeader>);

    const header = screen.getByTestId('header');
    expect(header).toHaveTextContent('Header content');
    expect(header).toHaveClass('flex');
    expect(header).toHaveClass('flex-col');
    expect(header).toHaveClass('space-y-1.5');
    expect(header).toHaveClass('p-4');
    expect(header).toHaveClass('pb-3');
  });

  it('applies custom className', () => {
    render(<CardHeader className="custom-header" data-testid="custom-header">Header</CardHeader>);

    const header = screen.getByTestId('custom-header');
    expect(header).toHaveClass('custom-header');
    expect(header).toHaveClass('flex'); // Still has default classes
  });
});

describe('CardTitle Component', () => {
  it('renders with proper styling', () => {
    render(<CardTitle>Card Title</CardTitle>);

    const title = screen.getByText('Card Title');
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-lg');
    expect(title).toHaveClass('font-semibold');
    expect(title).toHaveClass('leading-none');
    expect(title).toHaveClass('tracking-tight');
  });

  it('applies custom className', () => {
    render(<CardTitle className="custom-title">Title</CardTitle>);

    const title = screen.getByText('Title');
    expect(title).toHaveClass('custom-title');
    expect(title).toHaveClass('font-semibold'); // Still has default classes
  });

  it('passes through HTML attributes', () => {
    render(
      <CardTitle id="card-title" data-testid="title">
        Title with attributes
      </CardTitle>,
    );

    const title = screen.getByTestId('title');
    expect(title).toHaveAttribute('id', 'card-title');
  });
});

describe('CardDescription Component', () => {
  it('renders with proper styling', () => {
    render(<CardDescription>Card description text</CardDescription>);

    const description = screen.getByText('Card description text');
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('text-sm');
    expect(description).toHaveClass('text-muted-foreground');
  });

  it('applies custom className', () => {
    render(
      <CardDescription className="custom-description">
        Description
      </CardDescription>,
    );

    const description = screen.getByText('Description');
    expect(description).toHaveClass('custom-description');
    expect(description).toHaveClass('text-sm'); // Still has default classes
  });
});

describe('CardContent Component', () => {
  it('renders with proper styling', () => {
    render(<CardContent data-testid="content">Content area</CardContent>);

    const content = screen.getByTestId('content');
    expect(content).toHaveTextContent('Content area');
    expect(content).toHaveClass('p-4');
    expect(content).toHaveClass('pt-0');
  });

  it('applies custom className', () => {
    render(<CardContent className="custom-content" data-testid="custom-content">Content</CardContent>);

    const content = screen.getByTestId('custom-content');
    expect(content).toHaveClass('custom-content');
    expect(content).toHaveClass('p-4'); // Still has default classes
  });

  it('renders with children elements', () => {
    render(
      <CardContent>
        <p>Paragraph 1</p>
        <p>Paragraph 2</p>
      </CardContent>,
    );

    expect(screen.getByText('Paragraph 1')).toBeInTheDocument();
    expect(screen.getByText('Paragraph 2')).toBeInTheDocument();
  });
});

describe('CardFooter Component', () => {
  it('renders with proper styling', () => {
    render(<CardFooter data-testid="footer">Footer content</CardFooter>);

    const footer = screen.getByTestId('footer');
    expect(footer).toHaveTextContent('Footer content');
    expect(footer).toHaveClass('flex');
    expect(footer).toHaveClass('items-center');
    expect(footer).toHaveClass('p-4');
    expect(footer).toHaveClass('pt-0');
  });

  it('applies custom className', () => {
    render(<CardFooter className="custom-footer" data-testid="custom-footer">Footer</CardFooter>);

    const footer = screen.getByTestId('custom-footer');
    expect(footer).toHaveClass('custom-footer');
    expect(footer).toHaveClass('flex'); // Still has default classes
  });

  it('renders with multiple children', () => {
    render(
      <CardFooter>
        <button>Cancel</button>
        <button>Save</button>
      </CardFooter>,
    );

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
});

describe('Complete Card composition', () => {
  it('renders a complete card with all sub-components', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>This is a test card description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content goes here</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>,
    );

    // Card container
    const card = screen.getByText('Test Card').closest('.rounded-lg');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('bg-card');

    // Title
    const title = screen.getByText('Test Card');
    expect(title).toHaveClass('text-lg');
    expect(title).toHaveClass('font-semibold');

    // Description
    const description = screen.getByText('This is a test card description');
    expect(description).toHaveClass('text-sm');
    expect(description).toHaveClass('text-muted-foreground');

    // Content
    const content = screen.getByText('Card content goes here');
    expect(content).toBeInTheDocument();

    // Footer
    const button = screen.getByText('Action');
    expect(button).toBeInTheDocument();
  });

  it('renders card with custom props on all components', () => {
    render(
      <Card className="custom-card" id="main-card">
        <CardHeader className="custom-header">
          <CardTitle className="custom-title">Custom Title</CardTitle>
          <CardDescription className="custom-desc">
            Custom description
          </CardDescription>
        </CardHeader>
        <CardContent className="custom-content">
          Custom content
        </CardContent>
        <CardFooter className="custom-footer">
          Custom footer
        </CardFooter>
      </Card>,
    );

    const card = screen.getByText('Custom Title').closest('#main-card');
    expect(card).toHaveClass('custom-card');

    const title = screen.getByText('Custom Title');
    expect(title).toHaveClass('custom-title');

    const description = screen.getByText('Custom description');
    expect(description).toHaveClass('custom-desc');
  });
});
