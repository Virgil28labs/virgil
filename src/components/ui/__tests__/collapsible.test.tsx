import { render, screen, fireEvent } from '@testing-library/react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '../collapsible';

// Mock Radix UI Collapsible
jest.mock('@radix-ui/react-collapsible', () => {
  const React = require('react');
  
  return {
    Root: ({ children, open, defaultOpen, onOpenChange, ...props }: any) => {
      const [isOpen, setIsOpen] = React.useState(defaultOpen || open || false);
      
      React.useEffect(() => {
        if (open !== undefined) {
          setIsOpen(open);
        }
      }, [open]);

      const contextValue = {
        open: isOpen,
        onOpenChange: (newOpen: boolean) => {
          setIsOpen(newOpen);
          onOpenChange?.(newOpen);
        },
      };

      return (
        <div data-state={isOpen ? 'open' : 'closed'} {...props}>
          {React.Children.map(children, (child: any) =>
            React.isValidElement(child)
              ? React.cloneElement(child, { contextValue } as any)
              : child,
          )}
        </div>
      );
    },
    CollapsibleTrigger: ({ children, contextValue, ...props }: any) => {
      return (
        <button
          onClick={() => contextValue?.onOpenChange(!contextValue.open)}
          aria-expanded={contextValue?.open || false}
          data-state={contextValue?.open ? 'open' : 'closed'}
          {...props}
        >
          {children}
        </button>
      );
    },
    CollapsibleContent: ({ children, contextValue, ...props }: any) => {
      if (!contextValue?.open) return null;
      
      return (
        <div
          data-state={contextValue.open ? 'open' : 'closed'}
          {...props}
        >
          {children}
        </div>
      );
    },
  };
});

describe('Collapsible Component', () => {
  it('renders in closed state by default', () => {
    render(
      <Collapsible data-testid="collapsible">
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Hidden content</CollapsibleContent>
      </Collapsible>,
    );
    
    const collapsible = screen.getByTestId('collapsible');
    expect(collapsible).toHaveAttribute('data-state', 'closed');
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
  });

  it('renders in open state when defaultOpen is true', () => {
    render(
      <Collapsible defaultOpen data-testid="collapsible">
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Visible content</CollapsibleContent>
      </Collapsible>,
    );
    
    const collapsible = screen.getByTestId('collapsible');
    expect(collapsible).toHaveAttribute('data-state', 'open');
    expect(screen.getByText('Visible content')).toBeInTheDocument();
  });

  it('toggles content visibility when trigger is clicked', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Click me</CollapsibleTrigger>
        <CollapsibleContent>Collapsible content</CollapsibleContent>
      </Collapsible>,
    );
    
    const trigger = screen.getByText('Click me');
    
    // Initially closed
    expect(screen.queryByText('Collapsible content')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    
    // Click to open
    fireEvent.click(trigger);
    expect(screen.getByText('Collapsible content')).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    
    // Click to close
    fireEvent.click(trigger);
    expect(screen.queryByText('Collapsible content')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('calls onOpenChange callback when state changes', () => {
    const handleOpenChange = jest.fn();
    
    render(
      <Collapsible onOpenChange={handleOpenChange}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );
    
    const trigger = screen.getByText('Toggle');
    
    fireEvent.click(trigger);
    expect(handleOpenChange).toHaveBeenCalledWith(true);
    
    fireEvent.click(trigger);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it('can be controlled with open prop', () => {
    const { rerender } = render(
      <Collapsible open={false}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );
    
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    
    rerender(
      <Collapsible open>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );
    
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('passes through props to root element', () => {
    render(
      <Collapsible 
        id="test-collapsible"
        className="custom-class"
        data-testid="collapsible"
      >
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );
    
    const collapsible = screen.getByTestId('collapsible');
    expect(collapsible).toHaveAttribute('id', 'test-collapsible');
    expect(collapsible).toHaveClass('custom-class');
  });
});

describe('CollapsibleTrigger Component', () => {
  it('renders as a button', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Trigger Button</CollapsibleTrigger>
      </Collapsible>,
    );
    
    const trigger = screen.getByText('Trigger Button');
    expect(trigger.tagName).toBe('BUTTON');
  });

  it('passes through props', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger 
          className="trigger-class"
          data-testid="trigger"
          disabled
        >
          Trigger
        </CollapsibleTrigger>
      </Collapsible>,
    );
    
    const trigger = screen.getByTestId('trigger');
    expect(trigger).toHaveClass('trigger-class');
    expect(trigger).toBeDisabled();
  });

  it('updates data-state attribute based on open state', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger data-testid="trigger">Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    );
    
    const trigger = screen.getByTestId('trigger');
    
    expect(trigger).toHaveAttribute('data-state', 'closed');
    
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('data-state', 'open');
  });

  it('can render custom elements', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>
          <span>Custom trigger</span>
          <svg data-testid="icon">↓</svg>
        </CollapsibleTrigger>
      </Collapsible>,
    );
    
    expect(screen.getByText('Custom trigger')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});

describe('CollapsibleContent Component', () => {
  it('is hidden when collapsible is closed', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="content">
          Hidden content
        </CollapsibleContent>
      </Collapsible>,
    );
    
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('is visible when collapsible is open', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="content">
          Visible content
        </CollapsibleContent>
      </Collapsible>,
    );
    
    const content = screen.getByTestId('content');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('Visible content');
    expect(content).toHaveAttribute('data-state', 'open');
  });

  it('passes through props', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent 
          className="content-class"
          id="content-id"
          style={{ padding: '10px' }}
          data-testid="collapsible-content"
        >
          Content
        </CollapsibleContent>
      </Collapsible>,
    );
    
    const content = screen.getByTestId('collapsible-content');
    expect(content).toHaveClass('content-class');
    expect(content).toHaveAttribute('id', 'content-id');
    expect(content).toHaveStyle({ padding: '10px' });
  });

  it('can contain complex content', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>
          <div>
            <h3>Title</h3>
            <p>Paragraph content</p>
            <button>Action</button>
          </div>
        </CollapsibleContent>
      </Collapsible>,
    );
    
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Paragraph content')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });
});

describe('Complete Collapsible usage', () => {
  it('works with multiple collapsible sections', () => {
    render(
      <div>
        <Collapsible>
          <CollapsibleTrigger>Section 1</CollapsibleTrigger>
          <CollapsibleContent>Content 1</CollapsibleContent>
        </Collapsible>
        
        <Collapsible>
          <CollapsibleTrigger>Section 2</CollapsibleTrigger>
          <CollapsibleContent>Content 2</CollapsibleContent>
        </Collapsible>
      </div>,
    );
    
    const trigger1 = screen.getByText('Section 1');
    const trigger2 = screen.getByText('Section 2');
    
    // Both start closed
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    
    // Open first section
    fireEvent.click(trigger1);
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    
    // Open second section (first remains open)
    fireEvent.click(trigger2);
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });
});