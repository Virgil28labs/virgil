import { render, screen } from '@testing-library/react';
import { FormattedText } from './FormattedText';

describe('FormattedText', () => {
  it('renders basic text', () => {
    render(<FormattedText content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders bold text', () => {
    render(<FormattedText content="This is **bold** text" />);
    expect(screen.getByText('bold')).toHaveClass('font-semibold');
  });

  it('renders inline code', () => {
    render(<FormattedText content="Use `npm install` to install" />);
    expect(screen.getByText('npm install')).toHaveClass('mx-1', 'font-mono', 'text-xs');
  });

  it('correctly renders numbered lists with blank lines between items', () => {
    const content = `Here are some easy meals:

1. Easy Teriyaki Chicken

2. Veggie Stir-Fry

3. Egg Fried Rice

4. Miso Soup with Tofu`;

    render(<FormattedText content={content} />);
    
    // Check that all list items are present
    expect(screen.getByText(/Easy Teriyaki Chicken/)).toBeInTheDocument();
    expect(screen.getByText(/Veggie Stir-Fry/)).toBeInTheDocument();
    expect(screen.getByText(/Egg Fried Rice/)).toBeInTheDocument();
    expect(screen.getByText(/Miso Soup with Tofu/)).toBeInTheDocument();
    
    // Check that there's only one ordered list
    const lists = screen.getAllByRole('list');
    const orderedLists = lists.filter(list => list.tagName === 'OL');
    expect(orderedLists).toHaveLength(1);
    
    // Check that all items are in the same list
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(4);
  });

  it.skip('renders alert messages with emoji - TODO: implement custom alert handling', () => {
    render(<FormattedText content="💡 This is an important tip" />);
    expect(screen.getByText('💡')).toBeInTheDocument();
    expect(screen.getByText('This is an important tip')).toBeInTheDocument();
  });

  it('renders unordered lists', () => {
    const content = `Shopping list:
- Apples
- Bananas
- Oranges`;

    render(<FormattedText content={content} />);
    expect(screen.getByText('Apples')).toBeInTheDocument();
    expect(screen.getByText('Bananas')).toBeInTheDocument();
    expect(screen.getByText('Oranges')).toBeInTheDocument();
  });
});