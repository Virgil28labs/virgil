/**
 * EditableDataPoint Test Suite
 * 
 * Tests the editable data point component including:
 * - Display and edit modes
 * - Input types and formatting
 * - Keyboard interactions
 * - Date formatting
 * - Accessibility features
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditableDataPoint } from '../EditableDataPoint';
import { timeService } from '../../services/TimeService';

// Mock timeService
jest.mock('../../services/TimeService', () => ({
  timeService: {
    createDate: jest.fn((year, month, day) => new Date(year, month, day)),
    formatDateToLocal: jest.fn((_date, _options) => 'Jan 15, 2024'),
  },
}));

const mockTimeService = timeService as jest.Mocked<typeof timeService>;

describe('EditableDataPoint', () => {
  const defaultProps = {
    icon: '👤',
    label: 'Name',
    value: 'John Doe',
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with icon, label, and value', () => {
      render(<EditableDataPoint {...defaultProps} />);

      expect(screen.getByText('👤')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should show placeholder when value is empty', () => {
      render(<EditableDataPoint {...defaultProps} value="" />);

      expect(screen.getByText('Not set')).toBeInTheDocument();
    });

    it('should show custom placeholder', () => {
      render(
        <EditableDataPoint 
          {...defaultProps} 
          value="" 
          placeholder="Enter your name" 
        />,
      );

      expect(screen.getByText('Enter your name')).toBeInTheDocument();
    });

    it('should show edit icon when not read-only', () => {
      render(<EditableDataPoint {...defaultProps} />);

      expect(screen.getByText('✏️')).toBeInTheDocument();
    });

    it('should not show edit icon when read-only', () => {
      render(<EditableDataPoint {...defaultProps} readOnly />);

      expect(screen.queryByText('✏️')).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<EditableDataPoint {...defaultProps} className="custom-class" />);

      expect(document.querySelector('.data-point')).toHaveClass('custom-class');
    });
  });

  describe('editing mode', () => {
    it('should enter edit mode when clicked', async () => {
      const user = userEvent.setup();
      render(<EditableDataPoint {...defaultProps} />);

      const valueElement = screen.getByText('John Doe');
      await user.click(valueElement);

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should not enter edit mode when read-only', async () => {
      const user = userEvent.setup();
      render(<EditableDataPoint {...defaultProps} readOnly />);

      const valueElement = screen.getByText('John Doe');
      await user.click(valueElement);

      expect(screen.queryByDisplayValue('John Doe')).not.toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should focus and select input when entering edit mode', async () => {
      const user = userEvent.setup();
      render(<EditableDataPoint {...defaultProps} />);

      const valueElement = screen.getByText('John Doe');
      await user.click(valueElement);

      const input = screen.getByDisplayValue('John Doe') as HTMLInputElement;
      expect(input).toHaveFocus();
    });

    it('should exit edit mode and save on blur', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<EditableDataPoint {...defaultProps} onChange={onChange} />);

      const valueElement = screen.getByText('John Doe');
      await user.click(valueElement);

      const input = screen.getByDisplayValue('John Doe');
      await user.clear(input);
      await user.type(input, 'Jane Smith');
      fireEvent.blur(input);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('Jane Smith');
      });

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should not call onChange if value unchanged on blur', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<EditableDataPoint {...defaultProps} onChange={onChange} />);

      const valueElement = screen.getByText('John Doe');
      await user.click(valueElement);

      const input = screen.getByDisplayValue('John Doe');
      fireEvent.blur(input);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('keyboard interactions', () => {
    it('should enter edit mode on Enter key', async () => {
      const user = userEvent.setup();
      render(<EditableDataPoint {...defaultProps} />);

      const valueElement = screen.getByText('John Doe');
      valueElement.focus();
      await user.keyboard('{Enter}');

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    });

    it('should enter edit mode on Space key', async () => {
      const user = userEvent.setup();
      render(<EditableDataPoint {...defaultProps} />);

      const valueElement = screen.getByText('John Doe');
      valueElement.focus();
      await user.keyboard(' ');

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    });

    it('should save changes on Enter key in edit mode', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<EditableDataPoint {...defaultProps} onChange={onChange} />);

      const valueElement = screen.getByText('John Doe');
      await user.click(valueElement);

      const input = screen.getByDisplayValue('John Doe');
      await user.clear(input);
      await user.type(input, 'Jane Smith');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('Jane Smith');
      });
    });

    it('should cancel changes on Escape key', async () => {
      const user = userEvent.setup();
      const onChange = jest.fn();
      render(<EditableDataPoint {...defaultProps} onChange={onChange} />);

      const valueElement = screen.getByText('John Doe');
      await user.click(valueElement);

      const input = screen.getByDisplayValue('John Doe');
      await user.clear(input);
      await user.type(input, 'Jane Smith');
      await user.keyboard('{Escape}');

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });

  describe('input types', () => {
    it('should render text input by default', async () => {
      const user = userEvent.setup();
      render(<EditableDataPoint {...defaultProps} />);

      const valueElement = screen.getByText('John Doe');
      await user.click(valueElement);

      const input = screen.getByDisplayValue('John Doe');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should render date input when type is date', async () => {
      const user = userEvent.setup();
      render(<EditableDataPoint {...defaultProps} type="date" value="2024-01-15" />);

      const valueElement = screen.getByText('Jan 15, 2024');
      await user.click(valueElement);

      const input = screen.getByDisplayValue('2024-01-15');
      expect(input).toHaveAttribute('type', 'date');
    });

    it('should render email input when type is email', async () => {
      const user = userEvent.setup();
      render(<EditableDataPoint {...defaultProps} type="email" />);

      const valueElement = screen.getByText('John Doe');
      await user.click(valueElement);

      const input = screen.getByDisplayValue('John Doe');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should render tel input when type is tel', async () => {
      const user = userEvent.setup();
      render(<EditableDataPoint {...defaultProps} type="tel" />);

      const valueElement = screen.getByText('John Doe');
      await user.click(valueElement);

      const input = screen.getByDisplayValue('John Doe');
      expect(input).toHaveAttribute('type', 'tel');
    });
  });

  describe('date formatting', () => {
    it('should format date values in display mode', () => {
      mockTimeService.formatDateToLocal.mockReturnValue('Jan 15, 2024');
      
      render(
        <EditableDataPoint 
          {...defaultProps} 
          type="date" 
          value="2024-01-15" 
        />,
      );

      expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
      expect(mockTimeService.createDate).toHaveBeenCalledWith(2024, 0, 15); // month is 0-indexed
      expect(mockTimeService.formatDateToLocal).toHaveBeenCalledWith(
        expect.any(Date),
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        },
      );
    });

    it('should show raw value if date parsing fails', () => {
      mockTimeService.createDate.mockImplementation(() => {
        throw new Error('Invalid date');
      });

      render(
        <EditableDataPoint 
          {...defaultProps} 
          type="date" 
          value="invalid-date" 
        />,
      );

      expect(screen.getByText('invalid-date')).toBeInTheDocument();
    });

    it('should not format date values in edit mode', async () => {
      const user = userEvent.setup();
      render(
        <EditableDataPoint 
          {...defaultProps} 
          type="date" 
          value="2024-01-15" 
        />,
      );

      const valueElement = screen.getByText('Jan 15, 2024');
      await user.click(valueElement);

      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label for input', async () => {
      const user = userEvent.setup();
      render(<EditableDataPoint {...defaultProps} />);

      const valueElement = screen.getByText('John Doe');
      await user.click(valueElement);

      const input = screen.getByDisplayValue('John Doe');
      expect(input).toHaveAttribute('aria-label', 'Name');
    });

    it('should have proper aria-label for value', () => {
      render(<EditableDataPoint {...defaultProps} />);

      const valueElement = screen.getByLabelText('Name: John Doe, click to edit');
      expect(valueElement).toBeInTheDocument();
    });

    it('should have button role when not read-only', () => {
      render(<EditableDataPoint {...defaultProps} />);

      const valueElement = screen.getByRole('button');
      expect(valueElement).toBeInTheDocument();
    });

    it('should not have button role when read-only', () => {
      render(<EditableDataPoint {...defaultProps} readOnly />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should have tabIndex when not read-only', () => {
      render(<EditableDataPoint {...defaultProps} />);

      const valueElement = screen.getByText('John Doe');
      expect(valueElement).toHaveAttribute('tabIndex', '0');
    });

    it('should not have tabIndex when read-only', () => {
      render(<EditableDataPoint {...defaultProps} readOnly />);

      const valueElement = screen.getByText('John Doe');
      expect(valueElement).not.toHaveAttribute('tabIndex');
    });
  });

  describe('CSS classes', () => {
    it('should apply correct CSS classes', () => {
      render(<EditableDataPoint {...defaultProps} />);

      expect(document.querySelector('.data-point')).toBeInTheDocument();
      expect(document.querySelector('.editable')).toBeInTheDocument();
      expect(screen.getByText('👤')).toHaveClass('data-icon');
      expect(screen.getByText('Name')).toHaveClass('data-label');
      expect(screen.getByText('John Doe')).toHaveClass('data-value');
    });

    it('should apply placeholder class when value is empty', () => {
      render(<EditableDataPoint {...defaultProps} value="" />);

      expect(screen.getByText('Not set')).toHaveClass('placeholder');
    });

    it('should apply readonly class when read-only', () => {
      render(<EditableDataPoint {...defaultProps} readOnly />);

      expect(screen.getByText('John Doe')).toHaveClass('readonly');
    });
  });

  describe('value synchronization', () => {
    it('should update local value when prop value changes', () => {
      const { rerender } = render(<EditableDataPoint {...defaultProps} />);

      rerender(<EditableDataPoint {...defaultProps} value="New Value" />);

      expect(screen.getByText('New Value')).toBeInTheDocument();
    });
  });
});