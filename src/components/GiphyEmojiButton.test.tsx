import { render, screen, fireEvent } from "@testing-library/react";
import { GiphyEmojiButton } from "./GiphyEmojiButton";

// Mock the GiphyGallery component
jest.mock("./giphy/GiphyGallery", () => ({
  GiphyGallery: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="giphy-gallery">
        GIF Gallery
        <button onClick={onClose}>Close Gallery</button>
      </div>
    ) : null,
}));

describe("GiphyEmojiButton", () => {
  it("renders the emoji button", () => {
    render(<GiphyEmojiButton />);

    const button = screen.getByRole("button", { name: /open gif gallery/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("✨");
  });

  it("opens gallery when clicked", () => {
    render(<GiphyEmojiButton />);

    const button = screen.getByRole("button", { name: /open gif gallery/i });
    fireEvent.click(button);

    expect(screen.getByTestId("giphy-gallery")).toBeInTheDocument();
  });

  it("closes gallery when close button is clicked", () => {
    render(<GiphyEmojiButton />);

    // Open gallery
    const button = screen.getByRole("button", { name: /open gif gallery/i });
    fireEvent.click(button);

    // Close gallery
    const closeButton = screen.getByText("Close Gallery");
    fireEvent.click(closeButton);

    expect(screen.queryByTestId("giphy-gallery")).not.toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    render(<GiphyEmojiButton />);

    const button = screen.getByRole("button", { name: /open gif gallery/i });
    expect(button).toHaveAttribute("aria-label", "Open GIF Gallery");
    expect(button).toHaveAttribute(
      "title",
      expect.stringContaining("GIF Gallery"),
    );
  });

  it("applies hover effects", () => {
    render(<GiphyEmojiButton />);

    const button = screen.getByRole("button", { name: /open gif gallery/i });

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
    render(<GiphyEmojiButton />);

    const button = screen.getByRole("button", { name: /open gif gallery/i });

    // Focus the button
    button.focus();
    expect(button).toHaveClass("focus:outline-none");
    expect(button).toHaveClass("focus:ring-2");
  });

  it("prevents multiple galleries from opening", () => {
    render(<GiphyEmojiButton />);

    const button = screen.getByRole("button", { name: /open gif gallery/i });

    // Click multiple times quickly
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Should only have one gallery instance
    expect(screen.getAllByTestId("giphy-gallery")).toHaveLength(1);
  });
});
