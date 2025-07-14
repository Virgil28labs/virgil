import React from 'react';
import { render, screen } from '@testing-library/react';
import { VirgilLogo } from './VirgilLogo';

describe('VirgilLogo', () => {
  it('renders the logo text', () => {
    render(<VirgilLogo />);
    // Note: The text is "Virgil" with capital V
    expect(screen.getByText('Virgil')).toBeInTheDocument();
  });

  it('applies the correct CSS class', () => {
    const { container } = render(<VirgilLogo />);
    const logoElement = container.querySelector('.virgil-logo');
    expect(logoElement).toBeInTheDocument();
  });

  it('contains the brand name', () => {
    const { container } = render(<VirgilLogo />);
    const logoElement = container.querySelector('.virgil-logo');
    expect(logoElement).toHaveTextContent('Virgil');
  });
});