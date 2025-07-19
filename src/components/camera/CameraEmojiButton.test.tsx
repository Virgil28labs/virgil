import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CameraEmojiButton } from "./CameraEmojiButton";
import { EmojiButton } from "../common/EmojiButton";
import { CameraApp } from "./CameraApp";

// Mock the EmojiButton component
jest.mock("../common/EmojiButton", () => ({
  EmojiButton: jest.fn(({ emoji, ariaLabel, GalleryComponent, onClick }) => (
    <button
      aria-label={ariaLabel}
      onClick={() => {
        if (onClick) onClick();
        // Simulate opening the gallery
        if (GalleryComponent) {
          render(<GalleryComponent onClose={() => {}} />);
        }
      }}
    >
      {emoji}
    </button>
  )),
}));

// Mock CameraApp
jest.mock("./CameraApp", () => ({
  CameraApp: jest.fn(({ isOpen }) =>
    isOpen ? <div data-testid="camera-app">Camera App</div> : null,
  ),
}));

const mockEmojiButton = EmojiButton as jest.MockedFunction<typeof EmojiButton>;
const mockCameraApp = CameraApp as jest.MockedFunction<typeof CameraApp>;

describe("CameraEmojiButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders emoji button with camera emoji", () => {
    render(<CameraEmojiButton />);

    expect(screen.getByText("📸")).toBeInTheDocument();
  });

  it("has correct aria label", () => {
    render(<CameraEmojiButton />);

    expect(screen.getByLabelText("Open Virgil Camera")).toBeInTheDocument();
  });

  it("passes correct props to EmojiButton", () => {
    render(<CameraEmojiButton />);

    expect(mockEmojiButton).toHaveBeenCalledWith(
      expect.objectContaining({
        emoji: "📸",
        ariaLabel: "Open Virgil Camera",
        position: { top: "7rem", left: "1.9rem" },
        hoverScale: 1.15,
        hoverColor: {
          background:
            "linear-gradient(135deg, rgba(108, 59, 170, 0.3) 0%, rgba(239, 176, 194, 0.3) 100%)",
          border: "rgba(239, 176, 194, 0.6)",
          glow: "rgba(108, 59, 170, 0.4)",
        },
        title: "Take selfies with Virgil Camera!",
        className: "opacity-80 hover:opacity-100",
        GalleryComponent: expect.any(Function),
      }),
      {},
    );
  });

  it("opens CameraApp when clicked", async () => {
    const user = userEvent.setup();
    render(<CameraEmojiButton />);

    await user.click(screen.getByText("📸"));

    expect(screen.getByTestId("camera-app")).toBeInTheDocument();
  });

  it("passes GalleryComponent that renders CameraApp with isOpen=true", () => {
    render(<CameraEmojiButton />);

    const callArgs = mockEmojiButton.mock.calls[0][0];
    const GalleryComponent = callArgs.GalleryComponent;

    // Test the wrapper component
    render(<GalleryComponent onClose={jest.fn()} />);

    expect(mockCameraApp).toHaveBeenCalledWith(
      expect.objectContaining({
        isOpen: true,
        onClose: expect.any(Function),
      }),
      {},
    );
  });
});
