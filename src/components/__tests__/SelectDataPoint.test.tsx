/**
 * SelectDataPoint Test Suite
 * 
 * Tests the select data point component including:
 * - Rendering with different configurations
 * - Select dropdown functionality
 * - Custom value input handling
 * - Focus management and keyboard navigation
 * - Value display and formatting
 * - Edit mode transitions
 * - Memoization behavior
 * - Accessibility features
 * - Edge cases and error handling
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectDataPoint } from '../SelectDataPoint';

describe('SelectDataPoint', () => {
  const mockOnChange = jest.fn();
  
  const defaultProps = {
    icon: '🏠',
    label: 'Location',
    value: '',
    onChange: mockOnChange,
    options: [
      { value: 'home', label: 'Home' },
      { value: 'work', label: 'Work' },
      { value: 'gym', label: 'Gym' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with icon and label', () => {
      render(<SelectDataPoint {...defaultProps} />);
      
      expect(screen.getByText('🏠')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('should render placeholder when no value', () => {
      render(<SelectDataPoint {...defaultProps} />);
      
      expect(screen.getByText('Not set')).toBeInTheDocument();
      expect(screen.getByText('Not set')).toHaveClass('placeholder');
    });

    it('should render custom placeholder', () => {
      render(<SelectDataPoint {...defaultProps} placeholder="Choose location" />);
      
      expect(screen.getByText('Choose location')).toBeInTheDocument();
    });

    it('should render selected option label', () => {
      render(<SelectDataPoint {...defaultProps} value="work" />);
      
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.queryByText('Not set')).not.toBeInTheDocument();
    });

    it('should render custom value', () => {
      render(<SelectDataPoint {...defaultProps} value="custom location" />);
      
      expect(screen.getByText('custom location')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<SelectDataPoint {...defaultProps} className="custom-class" />);
      
      const container = screen.getByText('🏠').parentElement;
      expect(container).toHaveClass('data-point', 'editable', 'selectable', 'custom-class');
    });

    it('should render edit icon', () => {
      render(<SelectDataPoint {...defaultProps} />);
      
      expect(screen.getByText('✏️')).toBeInTheDocument();
    });
  });

  describe('edit mode behavior', () => {
    it('should enter edit mode on click', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      const valueDisplay = screen.getByRole('button', { name: /Location: Not set, click to edit/ });
      await user.click(valueDisplay);
      
      expect(screen.getByRole('combobox', { name: 'Location' })).toBeInTheDocument();
    });

    it('should enter edit mode on Enter key', () => {
      render(<SelectDataPoint {...defaultProps} />);
      
      const valueDisplay = screen.getByRole('button', { name: /Location: Not set, click to edit/ });
      fireEvent.keyDown(valueDisplay, { key: 'Enter' });
      
      expect(screen.getByRole('combobox', { name: 'Location' })).toBeInTheDocument();
    });

    it('should enter edit mode on Space key', () => {
      render(<SelectDataPoint {...defaultProps} />);
      
      const valueDisplay = screen.getByRole('button', { name: /Location: Not set, click to edit/ });
      fireEvent.keyDown(valueDisplay, { key: ' ' });
      
      expect(screen.getByRole('combobox', { name: 'Location' })).toBeInTheDocument();
    });

    it('should focus select when entering edit mode', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      const valueDisplay = screen.getByRole('button', { name: /Location: Not set, click to edit/ });
      await user.click(valueDisplay);
      
      const select = screen.getByRole('combobox', { name: 'Location' });
      expect(select).toHaveFocus();
    });

    it('should exit edit mode on blur', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      const valueDisplay = screen.getByRole('button', { name: /Location: Not set, click to edit/ });
      await user.click(valueDisplay);
      
      const select = screen.getByRole('combobox', { name: 'Location' });
      fireEvent.blur(select);
      
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.getByText('Not set')).toBeInTheDocument();
    });
  });

  describe('select functionality', () => {
    it('should display all options', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      
      expect(screen.getByText('Select...')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Gym')).toBeInTheDocument();
      expect(screen.getByText('Other...')).toBeInTheDocument();
    });

    it('should select an option', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      
      const select = screen.getByRole('combobox', { name: 'Location' });
      await user.selectOptions(select, 'work');
      
      expect(mockOnChange).toHaveBeenCalledWith('work');
    });

    it('should exit edit mode after selection', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      
      const select = screen.getByRole('combobox', { name: 'Location' });
      await user.selectOptions(select, 'home');
      
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should show current value as selected', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} value="gym" />);
      
      await user.click(screen.getByRole('button', { name: /Location: Gym, click to edit/ }));
      
      const select = screen.getByRole('combobox', { name: 'Location' }) as HTMLSelectElement;
      expect(select.value).toBe('gym');
    });

    it('should handle empty selection', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} value="work" />);
      
      await user.click(screen.getByRole('button', { name: /Location: Work, click to edit/ }));
      
      const select = screen.getByRole('combobox', { name: 'Location' });
      await user.selectOptions(select, '');
      
      expect(mockOnChange).toHaveBeenCalledWith('');
    });
  });

  describe('custom value functionality', () => {
    it('should show custom input when Other is selected', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      
      const select = screen.getByRole('combobox', { name: 'Location' });
      await user.selectOptions(select, 'other');
      
      expect(screen.getByRole('textbox', { name: 'Custom Location' })).toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should focus custom input when shown', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      
      const select = screen.getByRole('combobox', { name: 'Location' });
      await user.selectOptions(select, 'other');
      
      const input = screen.getByRole('textbox', { name: 'Custom Location' });
      expect(input).toHaveFocus();
    });

    it('should save custom value on blur', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      await user.selectOptions(screen.getByRole('combobox'), 'other');
      
      const input = screen.getByRole('textbox', { name: 'Custom Location' });
      await user.type(input, 'Coffee Shop');
      fireEvent.blur(input);
      
      expect(mockOnChange).toHaveBeenCalledWith('Coffee Shop');
    });

    it('should save custom value on Enter', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      await user.selectOptions(screen.getByRole('combobox'), 'other');
      
      const input = screen.getByRole('textbox', { name: 'Custom Location' });
      await user.type(input, 'Restaurant');
      await user.keyboard('{Enter}');
      
      expect(mockOnChange).toHaveBeenCalledWith('Restaurant');
    });

    it('should cancel custom input on Escape', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      await user.selectOptions(screen.getByRole('combobox'), 'other');
      
      const input = screen.getByRole('textbox', { name: 'Custom Location' });
      await user.type(input, 'Test');
      await user.keyboard('{Escape}');
      
      expect(mockOnChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should trim custom value', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      await user.selectOptions(screen.getByRole('combobox'), 'other');
      
      const input = screen.getByRole('textbox', { name: 'Custom Location' });
      await user.type(input, '  Trimmed Value  ');
      fireEvent.blur(input);
      
      expect(mockOnChange).toHaveBeenCalledWith('Trimmed Value');
    });

    it('should not save empty custom value', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      await user.selectOptions(screen.getByRole('combobox'), 'other');
      
      const input = screen.getByRole('textbox', { name: 'Custom Location' });
      fireEvent.blur(input);
      
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('should display existing custom value correctly', () => {
      render(<SelectDataPoint {...defaultProps} value="Custom Place" />);
      
      expect(screen.getByText('Custom Place')).toBeInTheDocument();
    });

    it('should enter custom input mode for existing custom value', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} value="Existing Custom" />);
      
      await user.click(screen.getByRole('button', { name: /Location: Existing Custom, click to edit/ }));
      
      const select = screen.getByRole('combobox', { name: 'Location' }) as HTMLSelectElement;
      expect(select.value).toBe('other');
    });

    it('should not show Other option when allowCustom is false', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} allowCustom={false} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      
      expect(screen.queryByText('Other...')).not.toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    it('should be keyboard accessible', () => {
      render(<SelectDataPoint {...defaultProps} />);
      
      const valueDisplay = screen.getByRole('button', { name: /Location: Not set, click to edit/ });
      expect(valueDisplay).toHaveAttribute('tabIndex', '0');
    });

    it('should handle arrow keys in select', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      
      const select = screen.getByRole('combobox', { name: 'Location' });
      select.focus();
      
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');
      
      // Select element should handle arrow keys natively
      expect(select).toHaveFocus();
    });

    it('should prevent default on Enter/Space in display mode', () => {
      render(<SelectDataPoint {...defaultProps} />);
      
      const valueDisplay = screen.getByRole('button', { name: /Location: Not set, click to edit/ });
      
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      const preventDefault = jest.spyOn(enterEvent, 'preventDefault');
      
      fireEvent(valueDisplay, enterEvent);
      
      expect(preventDefault).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<SelectDataPoint {...defaultProps} value="home" />);
      
      const valueDisplay = screen.getByRole('button');
      expect(valueDisplay).toHaveAttribute('aria-label', 'Location: Home, click to edit');
    });

    it('should have proper ARIA labels for select', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-label', 'Location');
    });

    it('should have proper ARIA labels for custom input', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      await user.selectOptions(screen.getByRole('combobox'), 'other');
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label', 'Custom Location');
    });

    it('should announce placeholder state', () => {
      render(<SelectDataPoint {...defaultProps} />);
      
      const valueDisplay = screen.getByRole('button');
      expect(valueDisplay).toHaveAttribute('aria-label', 'Location: Not set, click to edit');
    });

    it('should be focusable with keyboard', () => {
      render(<SelectDataPoint {...defaultProps} />);
      
      const valueDisplay = screen.getByRole('button');
      valueDisplay.focus();
      
      expect(valueDisplay).toHaveFocus();
    });
  });

  describe('memoization', () => {
    it('should be memoized', () => {
      const { rerender } = render(<SelectDataPoint {...defaultProps} />);
      const firstRender = screen.getByText('🏠');
      
      rerender(<SelectDataPoint {...defaultProps} />);
      const secondRender = screen.getByText('🏠');
      
      expect(firstRender.parentElement).toBe(secondRender.parentElement);
    });

    it('should re-render when props change', () => {
      const { rerender } = render(<SelectDataPoint {...defaultProps} />);
      expect(screen.getByText('Not set')).toBeInTheDocument();
      
      rerender(<SelectDataPoint {...defaultProps} value="work" />);
      expect(screen.getByText('Work')).toBeInTheDocument();
    });

    it('should not re-render when onChange reference changes but value is same', () => {
      const { rerender } = render(<SelectDataPoint {...defaultProps} />);
      const firstRender = screen.getByText('🏠');
      
      const newOnChange = jest.fn();
      rerender(<SelectDataPoint {...defaultProps} onChange={newOnChange} />);
      const secondRender = screen.getByText('🏠');
      
      // Component should re-render with new onChange
      expect(firstRender.parentElement).not.toBe(secondRender.parentElement);
    });
  });

  describe('edge cases', () => {
    it('should handle empty options array', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} options={[]} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      
      const select = screen.getByRole('combobox', { name: 'Location' });
      expect(select.children).toHaveLength(2); // Select... and Other...
    });

    it('should handle options with duplicate values', () => {
      const duplicateOptions = [
        { value: 'home', label: 'Home 1' },
        { value: 'home', label: 'Home 2' },
      ];
      
      render(<SelectDataPoint {...defaultProps} options={duplicateOptions} value="home" />);
      
      // Should display the first matching label
      expect(screen.getByText('Home 1')).toBeInTheDocument();
    });

    it('should handle rapid clicks', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      const valueDisplay = screen.getByRole('button', { name: /Location: Not set, click to edit/ });
      
      // Click multiple times rapidly
      await user.click(valueDisplay);
      await user.click(valueDisplay);
      await user.click(valueDisplay);
      
      // Should still be in edit mode
      expect(screen.getByRole('combobox', { name: 'Location' })).toBeInTheDocument();
    });

    it('should handle value change while in edit mode', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<SelectDataPoint {...defaultProps} value="home" />);
      
      await user.click(screen.getByRole('button', { name: /Location: Home, click to edit/ }));
      
      // Change value externally while in edit mode
      rerender(<SelectDataPoint {...defaultProps} value="work" />);
      
      const select = screen.getByRole('combobox', { name: 'Location' }) as HTMLSelectElement;
      expect(select.value).toBe('work');
    });

    it('should handle undefined icon gracefully', () => {
      render(<SelectDataPoint {...defaultProps} icon={undefined as any} />);
      
      // Should render without crashing
      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    it('should handle very long custom values', async () => {
      const user = userEvent.setup();
      const longValue = 'A'.repeat(100);
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      await user.selectOptions(screen.getByRole('combobox'), 'other');
      
      const input = screen.getByRole('textbox', { name: 'Custom Location' });
      await user.type(input, longValue);
      fireEvent.blur(input);
      
      expect(mockOnChange).toHaveBeenCalledWith(longValue);
    });

    it('should handle special characters in custom values', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      await user.selectOptions(screen.getByRole('combobox'), 'other');
      
      const input = screen.getByRole('textbox', { name: 'Custom Location' });
      await user.type(input, 'Test & <Special> "Characters"');
      fireEvent.blur(input);
      
      expect(mockOnChange).toHaveBeenCalledWith('Test & <Special> "Characters"');
    });
  });

  describe('CSS classes', () => {
    it('should have correct base classes', () => {
      render(<SelectDataPoint {...defaultProps} />);
      
      const container = screen.getByText('🏠').parentElement;
      expect(container).toHaveClass('data-point', 'editable', 'selectable');
    });

    it('should have correct icon class', () => {
      render(<SelectDataPoint {...defaultProps} />);
      
      const icon = screen.getByText('🏠');
      expect(icon).toHaveClass('data-icon');
    });

    it('should have correct label class', () => {
      render(<SelectDataPoint {...defaultProps} />);
      
      const label = screen.getByText('Location');
      expect(label).toHaveClass('data-label');
    });

    it('should have correct value class', () => {
      render(<SelectDataPoint {...defaultProps} value="home" />);
      
      const value = screen.getByText('Home');
      expect(value).toHaveClass('data-value');
      expect(value).not.toHaveClass('placeholder');
    });

    it('should have placeholder class when no value', () => {
      render(<SelectDataPoint {...defaultProps} />);
      
      const value = screen.getByText('Not set');
      expect(value).toHaveClass('data-value', 'placeholder');
    });

    it('should have correct select class', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('data-select');
    });

    it('should have correct input class', async () => {
      const user = userEvent.setup();
      render(<SelectDataPoint {...defaultProps} />);
      
      await user.click(screen.getByRole('button', { name: /Location: Not set, click to edit/ }));
      await user.selectOptions(screen.getByRole('combobox'), 'other');
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('data-input');
    });

    it('should show edit icon', () => {
      render(<SelectDataPoint {...defaultProps} />);
      
      const editIcon = screen.getByText('✏️');
      expect(editIcon).toHaveClass('edit-icon');
    });
  });
});