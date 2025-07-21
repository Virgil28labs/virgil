import { render, screen, fireEvent } from "@testing-library/react";
import { StreakTrackerButton } from "./StreakTrackerButton";

// Mock the MinimalHabitTracker component
jest.mock("./streak/MinimalHabitTracker", () => ({
  MinimalHabitTracker: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="streak-tracker">
        Streak Tracker
        <button onClick={onClose}>Close Tracker</button>
      </div>
    ) : null,
}));

// Mock React.lazy
jest.mock("react", () => ({
  ...jest.requireActual("react"),
  lazy: (fn: any) => {
    const Component = (props: any) => {
      const { MinimalHabitTracker } = require("./streak/MinimalHabitTracker");
      return <MinimalHabitTracker {...props} />;
    };
    return Component;
  },
}));

describe("StreakTrackerButton", () => {
  it("renders the emoji button", () => {
    render(<StreakTrackerButton />);

    const button = screen.getByRole("button", { name: /open habit tracker/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("🔥");
  });

  it("opens streak tracker when clicked", () => {
    render(<StreakTrackerButton />);

    const button = screen.getByRole("button", { name: /open habit tracker/i });
    fireEvent.click(button);

    expect(screen.getByTestId("streak-tracker")).toBeInTheDocument();
  });

  it("closes streak tracker when close button is clicked", () => {
    render(<StreakTrackerButton />);

    // Open tracker
    const button = screen.getByRole("button", { name: /open habit tracker/i });
    fireEvent.click(button);

    // Close tracker
    const closeButton = screen.getByText("Close Tracker");
    fireEvent.click(closeButton);

    expect(screen.queryByTestId("streak-tracker")).not.toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    render(<StreakTrackerButton />);

    const button = screen.getByRole("button", { name: /open habit tracker/i });
    expect(button).toHaveAttribute("aria-label", "Open Habit Tracker");
    expect(button).toHaveAttribute(
      "title",
      expect.stringContaining("Habit Tracker"),
    );
  });

  it("applies hover effects", () => {
    render(<StreakTrackerButton />);

    const button = screen.getByRole("button", { name: /open habit tracker/i });

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
    render(<StreakTrackerButton />);

    const button = screen.getByRole("button", { name: /open habit tracker/i });

    // Focus the button
    button.focus();
    expect(button).toHaveClass("focus:outline-none");
    expect(button).toHaveClass("focus:ring-2");
  });

  it("prevents multiple trackers from opening", () => {
    render(<StreakTrackerButton />);

    const button = screen.getByRole("button", { name: /open habit tracker/i });

    // Click multiple times quickly
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Should only have one tracker instance
    expect(screen.getAllByTestId("streak-tracker")).toHaveLength(1);
  });

  it("toggles tracker visibility", () => {
    render(<StreakTrackerButton />);

    const button = screen.getByRole("button", { name: /open habit tracker/i });

    // Open
    fireEvent.click(button);
    expect(screen.getByTestId("streak-tracker")).toBeInTheDocument();

    // Close by clicking button again (toggle behavior)
    fireEvent.click(button);
    expect(screen.queryByTestId("streak-tracker")).not.toBeInTheDocument();

    // Open again
    fireEvent.click(button);
    expect(screen.getByTestId("streak-tracker")).toBeInTheDocument();
  });

  it("has correct button styling", () => {
    render(<StreakTrackerButton />);

    const button = screen.getByRole("button", { name: /open habit tracker/i });

    // Check base classes
    expect(button).toHaveClass("emoji-button");
    expect(button).toHaveClass("transition-all");
    expect(button).toHaveClass("duration-200");

    // Check size and shape
    expect(button).toHaveClass("w-14");
    expect(button).toHaveClass("h-14");
    expect(button).toHaveClass("rounded-full");

    // Check background
    expect(button).toHaveClass("bg-white/10");
    expect(button).toHaveClass("backdrop-blur-sm");

    // Check hover state classes
    expect(button).toHaveClass("hover:bg-white/20");
    expect(button).toHaveClass("hover:scale-110");
  });

  it("renders fire emoji with correct styling", () => {
    render(<StreakTrackerButton />);

    const button = screen.getByRole("button", { name: /open habit tracker/i });
    const emoji = button.querySelector(".emoji");

    expect(emoji).toBeInTheDocument();
    expect(emoji).toHaveTextContent("🔥");
    expect(emoji).toHaveClass("text-2xl");
  });

  it("maintains state when tracker is closed", () => {
    render(<StreakTrackerButton />);

    const button = screen.getByRole("button", { name: /open habit tracker/i });

    // Open tracker
    fireEvent.click(button);
    expect(screen.getByTestId("streak-tracker")).toBeInTheDocument();

    // Close via close button
    const closeButton = screen.getByText("Close Tracker");
    fireEvent.click(closeButton);
    expect(screen.queryByTestId("streak-tracker")).not.toBeInTheDocument();

    // Open again - should work normally
    fireEvent.click(button);
    expect(screen.getByTestId("streak-tracker")).toBeInTheDocument();
  });

  it("supports keyboard interaction", () => {
    render(<StreakTrackerButton />);

    const button = screen.getByRole("button", { name: /open habit tracker/i });

    // Focus button
    button.focus();
    expect(document.activeElement).toBe(button);

    // Press Enter to open
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyUp(button, { key: "Enter" });
    fireEvent.click(button); // Simulating Enter key click behavior

    expect(screen.getByTestId("streak-tracker")).toBeInTheDocument();

    // Press Space to close
    fireEvent.keyDown(button, { key: " " });
    fireEvent.keyUp(button, { key: " " });
    fireEvent.click(button); // Simulating Space key click behavior

    expect(screen.queryByTestId("streak-tracker")).not.toBeInTheDocument();
  });

  it("has proper z-index for layering", () => {
    render(<StreakTrackerButton />);

    const button = screen.getByRole("button", { name: /open habit tracker/i });
    expect(button).toHaveClass("z-10");
  });

  it("uses proper cursor style", () => {
    render(<StreakTrackerButton />);

    const button = screen.getByRole("button", { name: /open habit tracker/i });
    expect(button).toHaveClass("cursor-pointer");
  });
});
