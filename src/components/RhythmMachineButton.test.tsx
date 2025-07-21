import { render, screen, fireEvent } from "@testing-library/react";
import { RhythmMachineButton } from "./RhythmMachineButton";

// Mock the RhythmMachineViewer component
jest.mock("./rhythm/RhythmMachineViewer", () => ({
  RhythmMachineViewer: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="rhythm-machine">
        Rhythm Machine
        <button onClick={onClose}>Close Machine</button>
      </div>
    ) : null,
}));

// Mock React.lazy
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  lazy: (fn: any) => {
    const Component = (props: any) => {
      const { RhythmMachineViewer } = require("./rhythm/RhythmMachineViewer");
      return <RhythmMachineViewer {...props} />;
    };
    return Component;
  },
}));

describe("RhythmMachineButton", () => {
  it("renders the emoji button", () => {
    render(<RhythmMachineButton />);

    const button = screen.getByRole("button", { name: /open rhythm machine/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("🥁");
  });

  it("opens rhythm machine when clicked", () => {
    render(<RhythmMachineButton />);

    const button = screen.getByRole("button", { name: /open rhythm machine/i });
    fireEvent.click(button);

    expect(screen.getByTestId("rhythm-machine")).toBeInTheDocument();
  });

  it("closes rhythm machine when close button is clicked", () => {
    render(<RhythmMachineButton />);

    // Open machine
    const button = screen.getByRole("button", { name: /open rhythm machine/i });
    fireEvent.click(button);

    // Close machine
    const closeButton = screen.getByText("Close Machine");
    fireEvent.click(closeButton);

    expect(screen.queryByTestId("rhythm-machine")).not.toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    render(<RhythmMachineButton />);

    const button = screen.getByRole("button", { name: /open rhythm machine/i });
    expect(button).toHaveAttribute(
      "aria-label",
      "Open Rhythm Machine - AI-powered drum sequencer",
    );
    expect(button).toHaveAttribute(
      "title",
      expect.stringContaining("AI Rhythm Machine"),
    );
  });

  it("applies hover effects", () => {
    render(<RhythmMachineButton />);

    const button = screen.getByRole("button", { name: /open rhythm machine/i });

    // Simulate hover
    fireEvent.mouseEnter(button);
    expect(button).toHaveClass("opacity-100");

    // Simulate hover end
    fireEvent.mouseLeave(button);
    expect(button).toHaveClass("opacity-80");
  });

  it("handles focus state", () => {
    render(<RhythmMachineButton />);

    const button = screen.getByRole("button", { name: /open rhythm machine/i });

    // Focus the button
    button.focus();
    expect(button).toHaveClass("focus:outline-none");
    expect(button).toHaveClass("focus:ring-2");
  });

  it("prevents multiple machines from opening", () => {
    render(<RhythmMachineButton />);

    const button = screen.getByRole("button", { name: /open rhythm machine/i });

    // Click multiple times quickly
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Should only have one machine instance
    expect(screen.getAllByTestId("rhythm-machine")).toHaveLength(1);
  });
});
