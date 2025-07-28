import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardAppErrorBoundary } from './DashboardAppErrorBoundary';
import { toastService } from '../../services/ToastService';

// Mock dependencies
jest.mock('../../services/ToastService');
jest.mock('../../lib/logger');

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

describe('DashboardAppErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the static error counts map before each test
    // @ts-ignore - accessing private static property for testing
    DashboardAppErrorBoundary.errorCounts.clear();
    // Suppress console.error for error boundary tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders children when there is no error', () => {
    render(
      <DashboardAppErrorBoundary appName="Test App">
        <div>Test content</div>
      </DashboardAppErrorBoundary>,
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  test('catches errors and displays error UI', () => {
    render(
      <DashboardAppErrorBoundary appName="Test App">
        <ThrowError shouldThrow />
      </DashboardAppErrorBoundary>,
    );

    expect(screen.getByText('Oops! Test App hit a snag')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Close App')).toBeInTheDocument();
  });

  test('shows toast notification on error', () => {
    render(
      <DashboardAppErrorBoundary appName="Test App">
        <ThrowError shouldThrow />
      </DashboardAppErrorBoundary>,
    );

    expect(toastService.error).toHaveBeenCalledWith('Error in Test App app. Click to retry.');
  });

  test('resets error state when Try Again is clicked', () => {
    // Use a stateful component to control throwing
    let shouldThrow = true;
    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error('Test error message');
      }
      return <div>No error</div>;
    };

    render(
      <DashboardAppErrorBoundary appName="Test App">
        <TestComponent />
      </DashboardAppErrorBoundary>,
    );

    expect(screen.getByText('Oops! Test App hit a snag')).toBeInTheDocument();

    // Set it to not throw on next render
    shouldThrow = false;

    // Click Try Again - this should reset the error boundary
    fireEvent.click(screen.getByText('Try Again'));

    // After reset, it should render the children without error
    expect(screen.getByText('No error')).toBeInTheDocument();
    expect(screen.queryByText('Oops! Test App hit a snag')).not.toBeInTheDocument();
  });

  test('calls onError callback when provided', () => {
    const onError = jest.fn();

    render(
      <DashboardAppErrorBoundary appName="Test App" onError={onError}>
        <ThrowError shouldThrow />
      </DashboardAppErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  test('shows different message after multiple errors', () => {
    // Mock the error counts to simulate 2 previous errors
    // @ts-ignore - accessing private static property for testing
    DashboardAppErrorBoundary.errorCounts.set('Test App', 2);

    // Use a component that throws on every render
    const AlwaysThrows = () => {
      throw new Error('Test error message');
    };

    render(
      <DashboardAppErrorBoundary appName="Test App">
        <AlwaysThrows />
      </DashboardAppErrorBoundary>,
    );

    // After 3rd error (2 previous + 1 current), should show persistent issues message
    expect(screen.getByText('This app seems to be having persistent issues. Try closing and reopening it.')).toBeInTheDocument();
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  test('shows error stack in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <DashboardAppErrorBoundary appName="Test App">
        <ThrowError shouldThrow />
      </DashboardAppErrorBoundary>,
    );

    expect(screen.getByText('Developer Info')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  test('handles Close App button click', () => {
    // Create a mock close button in the DOM
    const mockCloseButton = document.createElement('button');
    mockCloseButton.setAttribute('aria-label', 'Close modal');
    const mockClick = jest.fn();
    mockCloseButton.addEventListener('click', mockClick);
    document.body.appendChild(mockCloseButton);

    render(
      <DashboardAppErrorBoundary appName="Test App">
        <ThrowError shouldThrow />
      </DashboardAppErrorBoundary>,
    );

    fireEvent.click(screen.getByText('Close App'));

    expect(mockClick).toHaveBeenCalled();

    // Cleanup
    document.body.removeChild(mockCloseButton);
  });

  test('auto-resets after 5 seconds on first error', () => {
    jest.useFakeTimers();

    const { rerender } = render(
      <DashboardAppErrorBoundary appName="Test App">
        <ThrowError shouldThrow />
      </DashboardAppErrorBoundary>,
    );

    expect(screen.getByText('Oops! Test App hit a snag')).toBeInTheDocument();

    // Fast-forward 5 seconds
    jest.advanceTimersByTime(5000);

    // Rerender with non-throwing component
    rerender(
      <DashboardAppErrorBoundary appName="Test App">
        <ThrowError shouldThrow={false} />
      </DashboardAppErrorBoundary>,
    );

    expect(screen.getByText('No error')).toBeInTheDocument();

    jest.useRealTimers();
  });
});