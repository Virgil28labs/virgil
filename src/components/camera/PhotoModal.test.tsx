import { render, screen, fireEvent } from "@testing-library/react";
import { PhotoModal } from "./PhotoModal";

describe("PhotoModal", () => {
  const mockPhoto = {
    id: "1",
    url: "data:image/jpeg;base64,photo1",
    thumbnail: "data:image/jpeg;base64,thumb1",
    timestamp: new Date("2024-01-20T10:00:00").getTime(),
    isFavorite: false,
    tags: ["sunset", "landscape"],
    location: {
      latitude: 40.7128,
      longitude: -74.006,
      address: "New York, NY",
    },
    metadata: {
      width: 1920,
      height: 1080,
      size: 245760,
      mimeType: "image/jpeg",
    },
  };

  const defaultProps = {
    photo: mockPhoto,
    isOpen: true,
    onClose: jest.fn(),
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    onFavoriteToggle: jest.fn(),
    onDelete: jest.fn(),
    onShare: jest.fn(),
    onDownload: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders when open", () => {
    render(<PhotoModal {...defaultProps} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute("src", mockPhoto.url);
  });

  it("does not render when closed", () => {
    render(<PhotoModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not render without photo", () => {
    render(<PhotoModal {...defaultProps} photo={null} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("displays photo details", () => {
    render(<PhotoModal {...defaultProps} />);

    // Date
    expect(screen.getByText("Jan 20, 2024 10:00 AM")).toBeInTheDocument();

    // Tags
    expect(screen.getByText("sunset")).toBeInTheDocument();
    expect(screen.getByText("landscape")).toBeInTheDocument();

    // Location
    expect(screen.getByText("New York, NY")).toBeInTheDocument();

    // Metadata
    expect(screen.getByText("1920 × 1080")).toBeInTheDocument();
    expect(screen.getByText("240 KB")).toBeInTheDocument();
  });

  it("handles close button click", () => {
    render(<PhotoModal {...defaultProps} />);

    const closeButton = screen.getByLabelText("Close modal");
    fireEvent.click(closeButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("handles navigation buttons", () => {
    render(<PhotoModal {...defaultProps} />);

    const nextButton = screen.getByLabelText("Next photo");
    fireEvent.click(nextButton);
    expect(defaultProps.onNext).toHaveBeenCalled();

    const previousButton = screen.getByLabelText("Previous photo");
    fireEvent.click(previousButton);
    expect(defaultProps.onPrevious).toHaveBeenCalled();
  });

  it("hides navigation buttons when not provided", () => {
    render(
      <PhotoModal
        {...defaultProps}
        onNext={undefined}
        onPrevious={undefined}
      />,
    );

    expect(screen.queryByLabelText("Next photo")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Previous photo")).not.toBeInTheDocument();
  });

  it("handles favorite toggle", () => {
    render(<PhotoModal {...defaultProps} />);

    const favoriteButton = screen.getByLabelText("Toggle favorite");
    fireEvent.click(favoriteButton);

    expect(defaultProps.onFavoriteToggle).toHaveBeenCalledWith(mockPhoto.id);
  });

  it("shows correct favorite icon state", () => {
    const { rerender } = render(<PhotoModal {...defaultProps} />);

    // Not favorited
    expect(screen.getByText("🤍")).toBeInTheDocument();

    // Favorited
    const favoritedPhoto = { ...mockPhoto, isFavorite: true };
    rerender(<PhotoModal {...defaultProps} photo={favoritedPhoto} />);
    expect(screen.getByText("❤️")).toBeInTheDocument();
  });

  it("handles delete button", () => {
    render(<PhotoModal {...defaultProps} />);

    const deleteButton = screen.getByLabelText("Delete photo");
    fireEvent.click(deleteButton);

    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockPhoto.id);
  });

  it("handles share button", () => {
    render(<PhotoModal {...defaultProps} />);

    const shareButton = screen.getByLabelText("Share photo");
    fireEvent.click(shareButton);

    expect(defaultProps.onShare).toHaveBeenCalledWith(mockPhoto.id);
  });

  it("handles download button", () => {
    render(<PhotoModal {...defaultProps} />);

    const downloadButton = screen.getByLabelText("Download photo");
    fireEvent.click(downloadButton);

    expect(defaultProps.onDownload).toHaveBeenCalledWith(mockPhoto);
  });

  it("handles keyboard shortcuts", () => {
    render(<PhotoModal {...defaultProps} />);

    // Escape to close
    fireEvent.keyDown(document, { key: "Escape" });
    expect(defaultProps.onClose).toHaveBeenCalled();

    // Arrow keys for navigation
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(defaultProps.onNext).toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(defaultProps.onPrevious).toHaveBeenCalled();
  });

  it("prevents keyboard navigation when buttons not provided", () => {
    render(
      <PhotoModal
        {...defaultProps}
        onNext={undefined}
        onPrevious={undefined}
      />,
    );

    fireEvent.keyDown(document, { key: "ArrowRight" });
    fireEvent.keyDown(document, { key: "ArrowLeft" });

    // Should not throw errors
    expect(true).toBe(true);
  });

  it("closes on backdrop click", () => {
    render(<PhotoModal {...defaultProps} />);

    const backdrop = screen.getByTestId("modal-backdrop");
    fireEvent.click(backdrop);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("does not close on modal content click", () => {
    render(<PhotoModal {...defaultProps} />);

    const modalContent = screen.getByRole("dialog");
    fireEvent.click(modalContent);

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it("handles missing photo properties gracefully", () => {
    const minimalPhoto = {
      id: "1",
      url: "data:image/jpeg;base64,photo1",
      timestamp: Date.now(),
    };

    render(<PhotoModal {...defaultProps} photo={minimalPhoto as any} />);

    // Should render without errors
    expect(screen.getByRole("img")).toBeInTheDocument();

    // Should not show missing data
    expect(screen.queryByText("New York, NY")).not.toBeInTheDocument();
  });

  it("formats file size correctly", () => {
    const photoWithLargeSize = {
      ...mockPhoto,
      metadata: {
        ...mockPhoto.metadata,
        size: 5242880, // 5MB
      },
    };

    render(<PhotoModal {...defaultProps} photo={photoWithLargeSize} />);

    expect(screen.getByText("5.0 MB")).toBeInTheDocument();
  });

  it("handles GPS coordinates display", () => {
    render(<PhotoModal {...defaultProps} />);

    expect(screen.getByText("40.7128, -74.0060")).toBeInTheDocument();
  });

  it("shows loading state for large images", () => {
    render(<PhotoModal {...defaultProps} />);

    const image = screen.getByRole("img");

    // Should have loading attribute
    expect(image).toHaveAttribute("loading", "eager");
  });

  it("applies zoom on image click", () => {
    render(<PhotoModal {...defaultProps} />);

    const image = screen.getByRole("img");
    fireEvent.click(image);

    expect(image).toHaveClass("zoomed");

    // Click again to unzoom
    fireEvent.click(image);
    expect(image).not.toHaveClass("zoomed");
  });

  it("maintains aspect ratio", () => {
    render(<PhotoModal {...defaultProps} />);

    const imageContainer = screen.getByTestId("image-container");
    expect(imageContainer).toHaveStyle({
      maxWidth: "100%",
      maxHeight: "100%",
    });
  });

  it("shows action buttons only on hover", () => {
    render(<PhotoModal {...defaultProps} />);

    const modal = screen.getByRole("dialog");

    // Initially hidden
    const actionBar = screen.getByTestId("action-bar");
    expect(actionBar).toHaveClass("hidden");

    // Show on hover
    fireEvent.mouseEnter(modal);
    expect(actionBar).toHaveClass("visible");

    // Hide on mouse leave
    fireEvent.mouseLeave(modal);
    expect(actionBar).toHaveClass("hidden");
  });

  it("handles image load error", () => {
    render(<PhotoModal {...defaultProps} />);

    const image = screen.getByRole("img");
    fireEvent.error(image);

    expect(screen.getByText("Failed to load image")).toBeInTheDocument();
  });

  it("cleans up event listeners on unmount", () => {
    const { unmount } = render(<PhotoModal {...defaultProps} />);

    unmount();

    // Should not throw when triggering events after unmount
    fireEvent.keyDown(document, { key: "Escape" });
  });

  it("handles delete confirmation", () => {
    render(<PhotoModal {...defaultProps} showDeleteConfirmation />);

    const deleteButton = screen.getByLabelText("Delete photo");
    fireEvent.click(deleteButton);

    // Should show confirmation
    expect(screen.getByText("Delete this photo?")).toBeInTheDocument();

    // Confirm deletion
    const confirmButton = screen.getByText("Delete");
    fireEvent.click(confirmButton);

    expect(defaultProps.onDelete).toHaveBeenCalledWith(mockPhoto.id);
  });
});
