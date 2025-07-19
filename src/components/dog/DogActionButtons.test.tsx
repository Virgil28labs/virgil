import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DogActionButtons } from "./DogActionButtons";
import { downloadImage, copyImageToClipboard } from "./utils/imageUtils";
import type { DogImage } from "../../types";

// Mock the image utils
jest.mock("./utils/imageUtils", () => ({
  stopEvent: jest.fn(),
  downloadImage: jest.fn(),
  copyImageToClipboard: jest.fn(),
}));

const mockDownloadImage = downloadImage as jest.MockedFunction<
  typeof downloadImage
>;
const mockCopyImageToClipboard = copyImageToClipboard as jest.MockedFunction<
  typeof copyImageToClipboard
>;

const mockDog: DogImage = {
  id: "test-1",
  url: "https://example.com/dog.jpg",
  breed: "golden-retriever",
};

const defaultProps = {
  dog: mockDog,
  isFavorited: false,
  onFavoriteToggle: jest.fn(),
};

describe("DogActionButtons", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all action buttons", () => {
    render(<DogActionButtons {...defaultProps} />);

    expect(screen.getByLabelText("Add to favorites")).toBeInTheDocument();
    expect(screen.getByLabelText("Download image")).toBeInTheDocument();
    expect(screen.getByLabelText("Copy image")).toBeInTheDocument();
  });

  it("shows favorited state when dog is favorited", () => {
    render(<DogActionButtons {...defaultProps} isFavorited={true} />);

    const favoriteBtn = screen.getByLabelText("Remove from favorites");
    expect(favoriteBtn).toBeInTheDocument();
    expect(favoriteBtn).toHaveTextContent("❤️");
  });

  it("shows unfavorited state when dog is not favorited", () => {
    render(<DogActionButtons {...defaultProps} isFavorited={false} />);

    const favoriteBtn = screen.getByLabelText("Add to favorites");
    expect(favoriteBtn).toBeInTheDocument();
    expect(favoriteBtn).toHaveTextContent("🤍");
  });

  it("calls onFavoriteToggle when favorite button is clicked", () => {
    const mockToggle = jest.fn();
    render(
      <DogActionButtons {...defaultProps} onFavoriteToggle={mockToggle} />,
    );

    fireEvent.click(screen.getByLabelText("Add to favorites"));
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it("downloads image when download button is clicked", async () => {
    mockDownloadImage.mockResolvedValueOnce();

    render(<DogActionButtons {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Download image"));

    expect(mockDownloadImage).toHaveBeenCalledWith(mockDog.url, mockDog.breed);

    // Check for success feedback
    await waitFor(() => {
      expect(screen.getByText("✓")).toBeInTheDocument();
    });
  });

  it("copies image when copy button is clicked", async () => {
    mockCopyImageToClipboard.mockResolvedValueOnce(true);

    render(<DogActionButtons {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Copy image"));

    expect(mockCopyImageToClipboard).toHaveBeenCalledWith(mockDog.url);

    // Check for success feedback
    await waitFor(() => {
      expect(screen.getByText("✓")).toBeInTheDocument();
    });
  });

  it("handles download error gracefully", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockDownloadImage.mockRejectedValueOnce(new Error("Download failed"));

    render(<DogActionButtons {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Download image"));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to download image:",
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });

  it("handles copy error gracefully", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockCopyImageToClipboard.mockRejectedValueOnce(new Error("Copy failed"));

    render(<DogActionButtons {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Copy image"));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to copy image:",
        expect.any(Error),
      );
    });

    consoleSpy.mockRestore();
  });

  it("uses custom handlers when provided", async () => {
    const mockCustomDownload = jest.fn();
    const mockCustomCopy = jest.fn();

    render(
      <DogActionButtons
        {...defaultProps}
        onDownload={mockCustomDownload}
        onCopy={mockCustomCopy}
      />,
    );

    fireEvent.click(screen.getByLabelText("Download image"));
    fireEvent.click(screen.getByLabelText("Copy image"));

    expect(mockCustomDownload).toHaveBeenCalledTimes(1);
    expect(mockCustomCopy).toHaveBeenCalledTimes(1);
    expect(mockDownloadImage).not.toHaveBeenCalled();
    expect(mockCopyImageToClipboard).not.toHaveBeenCalled();
  });

  it("applies size classes correctly", () => {
    const { rerender } = render(
      <DogActionButtons {...defaultProps} size="small" />,
    );
    expect(
      document.querySelector(".doggo-action-btn--small"),
    ).toBeInTheDocument();

    rerender(<DogActionButtons {...defaultProps} size="large" />);
    expect(
      document.querySelector(".doggo-action-btn--large"),
    ).toBeInTheDocument();
  });

  it("shows labels when showLabels is true", () => {
    render(<DogActionButtons {...defaultProps} showLabels={true} />);

    expect(screen.getByText("Favorite")).toBeInTheDocument();
    expect(screen.getByText("Download")).toBeInTheDocument();
    expect(screen.getByText("Copy")).toBeInTheDocument();
  });

  it("resets feedback states after timeout", async () => {
    jest.useFakeTimers();
    mockDownloadImage.mockResolvedValueOnce();

    render(<DogActionButtons {...defaultProps} />);

    fireEvent.click(screen.getByLabelText("Download image"));

    await waitFor(() => {
      expect(screen.getByText("✓")).toBeInTheDocument();
    });

    // Fast-forward past the timeout
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.getByText("⬇️")).toBeInTheDocument();
    });

    jest.useRealTimers();
  });
});
