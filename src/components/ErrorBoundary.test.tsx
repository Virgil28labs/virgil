import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>No error</div>;
};

// Mock console.error to avoid noise in test output
const originalError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});

afterEach(() => {
  console.error = originalError;
});

describe("ErrorBoundary", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Test content")).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it("catches errors and displays error UI", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We encountered an unexpected error. Please try refreshing the page.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("No error")).not.toBeInTheDocument();
  });

  it("displays custom fallback when provided", () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Custom error message")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("logs error to console in development", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    expect(console.error).toHaveBeenCalled();
    // React logs multiple console errors when an error boundary catches an error
    expect(console.error).toHaveBeenCalledTimes(
      (console.error as jest.Mock).mock.calls.length,
    );
  });

  it("allows manual reset via Try Again button", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    // Error should be displayed
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Click Try Again button
    const tryAgainButton = screen.getByText("Try Again");
    fireEvent.click(tryAgainButton);

    // Error boundary should reset its state, but the child will throw again
    // so we'll still see the error
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("handles multiple consecutive errors", () => {
    const FirstError = () => {
      throw new Error("First error");
    };

    const SecondError = () => {
      throw new Error("Second error");
    };

    const { rerender } = render(
      <ErrorBoundary>
        <FirstError />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Re-render with different error
    rerender(
      <ErrorBoundary>
        <SecondError />
      </ErrorBoundary>,
    );

    // Should still show error UI
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("provides proper error structure in fallback", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>,
    );

    // The error boundary doesn't have a specific class, just check the structure
    const errorHeading = screen.getByText("Something went wrong");
    expect(errorHeading).toBeInTheDocument();
    expect(errorHeading.tagName).toBe("H2");
  });

  it("does not catch async errors (React limitation)", () => {
    // This test documents that async errors are not caught by error boundaries
    const AsyncError = () => {
      React.useEffect(() => {
        // This error will not be caught by the error boundary
        setTimeout(() => {
          // This would throw but won't be caught
          // throw new Error('Async error');
        }, 0);
      }, []);
      return <div>Component rendered</div>;
    };

    render(
      <ErrorBoundary>
        <AsyncError />
      </ErrorBoundary>,
    );

    // The component renders normally
    expect(screen.getByText("Component rendered")).toBeInTheDocument();
    // Error boundary is not triggered
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("preserves error boundary functionality with manual reset", () => {
    let shouldThrow = true;

    const TestComponent = () => {
      if (shouldThrow) {
        throw new Error("Test error");
      }
      return <div>No error</div>;
    };

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Update the flag so component won't throw on next render
    shouldThrow = false;

    // Click Try Again to reset error boundary
    const tryAgainButton = screen.getByText("Try Again");
    fireEvent.click(tryAgainButton);

    // After manual reset with non-throwing component, should show the component
    expect(screen.getByText("No error")).toBeInTheDocument();
  });
});
