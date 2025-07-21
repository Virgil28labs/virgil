import { render, screen, fireEvent } from "@testing-library/react";
import { NasaApodButton } from "./NasaApodButton";

// Mock the NasaApodViewer component
jest.mock("./nasa/NasaApodViewer", () => ({
  NasaApodViewer: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="nasa-viewer">
        NASA APOD Viewer
        <button onClick={onClose}>Close Viewer</button>
      </div>
    ) : null,
}));

describe("NasaApodButton", () => {
  it("renders the emoji button", () => {
    render(<NasaApodButton />);

    const button = screen.getByRole("button", {
      name: /open nasa astronomy picture/i,
    });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("🚀");
  });

  it("opens viewer when clicked", () => {
    render(<NasaApodButton />);

    const button = screen.getByRole("button", {
      name: /open nasa astronomy picture/i,
    });
    fireEvent.click(button);

    expect(screen.getByTestId("nasa-viewer")).toBeInTheDocument();
  });

  it("closes viewer when close button is clicked", () => {
    render(<NasaApodButton />);

    // Open viewer
    const button = screen.getByRole("button", {
      name: /open nasa astronomy picture/i,
    });
    fireEvent.click(button);

    // Close viewer
    const closeButton = screen.getByText("Close Viewer");
    fireEvent.click(closeButton);

    expect(screen.queryByTestId("nasa-viewer")).not.toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    render(<NasaApodButton />);

    const button = screen.getByRole("button", {
      name: /open nasa astronomy picture/i,
    });
    expect(button).toHaveAttribute(
      "aria-label",
      "Open NASA Astronomy Picture of the Day",
    );
    expect(button).toHaveAttribute("title", expect.stringContaining("NASA"));
  });

  it("applies hover effects", () => {
    render(<NasaApodButton />);

    const button = screen.getByRole("button", {
      name: /open nasa astronomy picture/i,
    });

    // Check initial state
    expect(button).toHaveStyle({ opacity: "0.8" });

    // Simulate hover
    fireEvent.mouseEnter(button);
    expect(button).toHaveStyle({ opacity: "1" });

    // Simulate hover end
    fireEvent.mouseLeave(button);
    expect(button).toHaveStyle({ opacity: "0.8" });
  });

  it("handles focus state", () => {
    render(<NasaApodButton />);

    const button = screen.getByRole("button", {
      name: /open nasa astronomy picture/i,
    });

    // Focus the button
    button.focus();
    expect(button).toHaveClass("focus:outline-none");
    expect(button).toHaveClass("focus:ring-2");
  });

  it("prevents multiple viewers from opening", () => {
    render(<NasaApodButton />);

    const button = screen.getByRole("button", {
      name: /open nasa astronomy picture/i,
    });

    // Click multiple times quickly
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Should only have one viewer instance
    expect(screen.getAllByTestId("nasa-viewer")).toHaveLength(1);
  });
});
