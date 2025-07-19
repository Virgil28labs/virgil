import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { RhythmMachine } from "./RhythmMachine";
import { RhythmService } from "../../services/rhythm/RhythmService";

// Mock the RhythmService
jest.mock("../../services/rhythm/RhythmService");

const mockRhythmService = {
  initialize: jest.fn().mockResolvedValue(undefined),
  togglePlayback: jest.fn(),
  setBPM: jest.fn(),
  toggleInstrument: jest.fn(),
  clearPattern: jest.fn(),
  randomizePattern: jest.fn(),
  destroy: jest.fn(),
  isPlaying: false,
  bpm: 120,
  instruments: [
    {
      name: "Kick",
      pattern: [true, false, false, false, true, false, false, false],
      active: true,
    },
    {
      name: "Snare",
      pattern: [false, false, true, false, false, false, true, false],
      active: true,
    },
    {
      name: "Hi-hat",
      pattern: [true, true, true, true, true, true, true, true],
      active: true,
    },
    {
      name: "Clap",
      pattern: [false, false, false, false, true, false, false, false],
      active: false,
    },
  ],
  currentStep: 0,
};

// Create mock instance
RhythmService.getInstance = jest.fn().mockReturnValue(mockRhythmService);

describe("RhythmMachine", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    mockRhythmService.isPlaying = false;
    mockRhythmService.bpm = 120;
    mockRhythmService.currentStep = 0;
  });

  it("renders when open", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText("Rhythm Machine")).toBeInTheDocument();
    });

    expect(mockRhythmService.initialize).toHaveBeenCalled();
  });

  it("does not render when closed", () => {
    render(<RhythmMachine isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByText("Rhythm Machine")).not.toBeInTheDocument();
  });

  it("displays controls", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
      expect(screen.getByText("120 BPM")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /clear/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /random/i }),
      ).toBeInTheDocument();
    });
  });

  it("toggles playback", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      const playButton = screen.getByRole("button", { name: /play/i });
      fireEvent.click(playButton);
    });

    expect(mockRhythmService.togglePlayback).toHaveBeenCalled();
  });

  it("changes BPM", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      const bpmSlider = screen.getByRole("slider", { name: /bpm/i });
      fireEvent.change(bpmSlider, { target: { value: "140" } });
    });

    expect(mockRhythmService.setBPM).toHaveBeenCalledWith(140);
  });

  it("displays BPM range", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      const bpmSlider = screen.getByRole("slider", { name: /bpm/i });
      expect(bpmSlider).toHaveAttribute("min", "60");
      expect(bpmSlider).toHaveAttribute("max", "200");
    });
  });

  it("displays instrument grid", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText("Kick")).toBeInTheDocument();
      expect(screen.getByText("Snare")).toBeInTheDocument();
      expect(screen.getByText("Hi-hat")).toBeInTheDocument();
      expect(screen.getByText("Clap")).toBeInTheDocument();
    });
  });

  it("toggles instrument active state", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      // Click on instrument name to toggle
      const kickLabel = screen.getByText("Kick");
      fireEvent.click(kickLabel);
    });

    expect(mockRhythmService.toggleInstrument).toHaveBeenCalledWith(0);
  });

  it("toggles pattern steps", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      // Find step buttons for first instrument
      const stepButtons = screen.getAllByRole("button", { name: /step/i });
      fireEvent.click(stepButtons[0]); // Click first step of first instrument
    });

    expect(mockRhythmService.toggleInstrument).toHaveBeenCalledWith(0, 0);
  });

  it("clears pattern", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      const clearButton = screen.getByRole("button", { name: /clear/i });
      fireEvent.click(clearButton);
    });

    expect(mockRhythmService.clearPattern).toHaveBeenCalled();
  });

  it("randomizes pattern", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      const randomButton = screen.getByRole("button", { name: /random/i });
      fireEvent.click(randomButton);
    });

    expect(mockRhythmService.randomizePattern).toHaveBeenCalled();
  });

  it("closes on close button click", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      const closeButton = screen.getByRole("button", { name: /close/i });
      fireEvent.click(closeButton);
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("closes on Escape key", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText("Rhythm Machine")).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("destroys service on unmount", async () => {
    const { unmount } = render(
      <RhythmMachine isOpen={true} onClose={mockOnClose} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Rhythm Machine")).toBeInTheDocument();
    });

    unmount();

    expect(mockRhythmService.destroy).toHaveBeenCalled();
  });

  it("shows loading state during initialization", () => {
    // Make initialize return a pending promise
    let resolveInit: () => void;
    mockRhythmService.initialize.mockReturnValue(
      new Promise((resolve) => {
        resolveInit = resolve;
      }),
    );

    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Resolve initialization
    act(() => {
      resolveInit!();
    });
  });

  it("shows error state on initialization failure", async () => {
    mockRhythmService.initialize.mockRejectedValueOnce(
      new Error("Audio context failed"),
    );

    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByText(/error initializing/i)).toBeInTheDocument();
    });
  });

  it("updates play button text based on playing state", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
    });

    // Simulate playing state
    mockRhythmService.isPlaying = true;
    mockRhythmService.togglePlayback.mockImplementation(() => {
      mockRhythmService.isPlaying = !mockRhythmService.isPlaying;
    });

    const playButton = screen.getByRole("button", { name: /play/i });
    fireEvent.click(playButton);

    // Re-render to update UI
    const { rerender } = render(
      <RhythmMachine isOpen={true} onClose={mockOnClose} />,
    );
    rerender(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /stop/i })).toBeInTheDocument();
    });
  });

  it("highlights current step during playback", async () => {
    mockRhythmService.isPlaying = true;
    mockRhythmService.currentStep = 3;

    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      const stepButtons = screen.getAllByRole("button", { name: /step/i });
      // Check that the 4th step (index 3) in each row has the current class
      const currentSteps = stepButtons.filter((_, index) => index % 8 === 3);
      currentSteps.forEach((step) => {
        expect(step).toHaveClass("current");
      });
    });
  });

  it("applies active/inactive styles to instruments", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      const kickLabel = screen.getByText("Kick");
      const clapLabel = screen.getByText("Clap");

      // Kick is active
      expect(kickLabel).toHaveClass("active");
      // Clap is inactive
      expect(clapLabel).toHaveClass("inactive");
    });
  });

  it("applies active/inactive styles to pattern steps", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      const stepButtons = screen.getAllByRole("button", { name: /step/i });

      // First instrument (Kick) first step should be active
      expect(stepButtons[0]).toHaveClass("active");
      // First instrument second step should be inactive
      expect(stepButtons[1]).toHaveClass("inactive");
    });
  });

  it("handles click outside to close", async () => {
    render(
      <div>
        <div data-testid="outside">Outside element</div>
        <RhythmMachine isOpen={true} onClose={mockOnClose} />
      </div>,
    );

    await waitFor(() => {
      expect(screen.getByText("Rhythm Machine")).toBeInTheDocument();
    });

    // Click outside
    fireEvent.mouseDown(screen.getByTestId("outside"));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("does not close when clicking inside", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      const machine = screen.getByRole("dialog");
      fireEvent.mouseDown(machine);
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("has proper accessibility attributes", async () => {
    render(<RhythmMachine isOpen={true} onClose={mockOnClose} />);

    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveAttribute("aria-label", "Rhythm Machine");
      expect(dialog).toHaveAttribute("aria-modal", "true");
    });
  });
});
