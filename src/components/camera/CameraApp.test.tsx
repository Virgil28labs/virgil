import { render, screen, fireEvent, act } from "@testing-library/react";
import { CameraApp } from "./CameraApp";
import { usePhotoGallery } from "./hooks/usePhotoGallery";
import { useToast } from "../../hooks/useToast";

// Mock hooks
jest.mock("./hooks/usePhotoGallery");
jest.mock("../../hooks/useToast");

// Mock child components
jest.mock("./PhotoGallery", () => ({
  PhotoGallery: ({ onPhotoSelect, onError }: any) => (
    <div data-testid="photo-gallery">
      Photo Gallery
      <button onClick={() => onPhotoSelect({ id: "1", dataUrl: "photo1.jpg" })}>
        Select Photo
      </button>
      <button onClick={() => onError("Test error")}>Trigger Error</button>
    </div>
  ),
}));

jest.mock("./PhotoModal", () => ({
  PhotoModal: ({
    photo,
    isOpen,
    onClose,
    onNext,
    onPrevious,
    onFavoriteToggle,
    onDelete,
    onShare,
  }: any) =>
    isOpen ? (
      <div data-testid="photo-modal">
        <img src={photo?.dataUrl} alt="" />
        <button onClick={onClose}>Close Modal</button>
        {onNext && <button onClick={onNext}>Next</button>}
        {onPrevious && <button onClick={onPrevious}>Previous</button>}
        <button onClick={() => onFavoriteToggle(photo?.id)}>
          Toggle Favorite
        </button>
        <button onClick={() => onDelete(photo?.id)}>Delete</button>
        <button onClick={() => onShare(photo?.id)}>Share</button>
      </div>
    ) : null,
}));

const mockUsePhotoGallery = usePhotoGallery as jest.MockedFunction<
  typeof usePhotoGallery
>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const mockPhotos = [
  { id: "1", dataUrl: "photo1.jpg", timestamp: Date.now(), isFavorite: false },
  { id: "2", dataUrl: "photo2.jpg", timestamp: Date.now(), isFavorite: true },
  { id: "3", dataUrl: "photo3.jpg", timestamp: Date.now(), isFavorite: false },
];

const defaultGalleryState = {
  photos: mockPhotos,
  favorites: mockPhotos.filter((p) => p.isFavorite),
  activeTab: "gallery" as const,
  selectedPhoto: null,
  selectedPhotos: new Set<string>(),
  searchQuery: "",
  sortBy: "date" as const,
  sortOrder: "desc" as const,
  isSelectionMode: false,
  isLoading: false,
  filter: "all" as const,
};

const defaultPhotoGalleryMock = {
  galleryState: defaultGalleryState,
  loading: false,
  error: null,
  getCurrentPhotos: jest.fn(() => mockPhotos),
  setActiveTab: jest.fn(),
  setSelectedPhoto: jest.fn(),
  togglePhotoSelection: jest.fn(),
  selectAllPhotos: jest.fn(),
  clearSelection: jest.fn(),
  setSearchQuery: jest.fn(),
  setSortBy: jest.fn(),
  setSortOrder: jest.fn(),
  setFilter: jest.fn(),
  handlePhotoCapture: jest.fn(),
  handlePhotoDelete: jest.fn().mockResolvedValue(true),
  handleDeleteMultiple: jest.fn(),
  handlePhotoDownload: jest.fn(),
  handleDownloadMultiple: jest.fn(),
  handleFavoriteToggle: jest.fn().mockResolvedValue(true),
  navigatePhoto: jest.fn(),
  getPhotoStats: jest.fn(),
  clearError: jest.fn(),
  handleBulkDelete: jest.fn(),
  handleBulkFavorite: jest.fn(),
  loadPhotos: jest.fn(),
};

const mockAddToast = jest.fn();

describe("CameraApp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePhotoGallery.mockReturnValue(defaultPhotoGalleryMock);
    mockUseToast.mockReturnValue({
      toasts: [],
      addToast: mockAddToast,
      removeToast: jest.fn(),
      clearToasts: jest.fn(),
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
    });
  });

  it("renders when open", () => {
    render(<CameraApp isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByText("Virgil Camera")).toBeInTheDocument();
    expect(screen.getByTestId("photo-gallery")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<CameraApp isOpen={false} onClose={jest.fn()} />);

    expect(screen.queryByText("Virgil Camera")).not.toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();
    render(<CameraApp isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByLabelText("Close camera app");
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape key when modal is not open", () => {
    const onClose = jest.fn();
    render(<CameraApp isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });

  it("does not close on Escape key when photo modal is open", () => {
    const onClose = jest.fn();
    render(<CameraApp isOpen={true} onClose={onClose} />);

    // Open photo modal
    const selectPhotoButton = screen.getByText("Select Photo");
    act(() => {
      fireEvent.click(selectPhotoButton);
    });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("opens photo modal when photo is selected", () => {
    render(<CameraApp isOpen={true} onClose={jest.fn()} />);

    const selectPhotoButton = screen.getByText("Select Photo");
    act(() => {
      fireEvent.click(selectPhotoButton);
    });

    expect(screen.getByTestId("photo-modal")).toBeInTheDocument();
  });

  it("closes photo modal", () => {
    render(<CameraApp isOpen={true} onClose={jest.fn()} />);

    // Open modal
    const selectPhotoButton = screen.getByText("Select Photo");
    act(() => {
      fireEvent.click(selectPhotoButton);
    });

    // Close modal
    const closeModalButton = screen.getByText("Close Modal");
    act(() => {
      fireEvent.click(closeModalButton);
    });

    expect(screen.queryByTestId("photo-modal")).not.toBeInTheDocument();
  });

  it("handles error from gallery", () => {
    render(<CameraApp isOpen={true} onClose={jest.fn()} />);

    const errorButton = screen.getByText("Trigger Error");
    fireEvent.click(errorButton);

    expect(mockAddToast).toHaveBeenCalledWith({
      type: "error",
      message: "Test error",
      duration: 5000,
    });
  });

  it("navigates to next photo", () => {
    render(<CameraApp isOpen={true} onClose={jest.fn()} />);

    // Open modal
    const selectPhotoButton = screen.getByText("Select Photo");
    act(() => {
      fireEvent.click(selectPhotoButton);
    });

    // Navigate next
    const nextButton = screen.getByText("Next");
    act(() => {
      fireEvent.click(nextButton);
    });

    expect(defaultPhotoGalleryMock.navigatePhoto).toHaveBeenCalledWith("next");
  });

  it("navigates to previous photo", () => {
    render(<CameraApp isOpen={true} onClose={jest.fn()} />);

    // Open modal
    const selectPhotoButton = screen.getByText("Select Photo");
    act(() => {
      fireEvent.click(selectPhotoButton);
    });

    // Navigate previous
    const previousButton = screen.getByText("Previous");
    act(() => {
      fireEvent.click(previousButton);
    });

    expect(defaultPhotoGalleryMock.navigatePhoto).toHaveBeenCalledWith(
      "previous",
    );
  });

  it("toggles favorite status", async () => {
    render(<CameraApp isOpen={true} onClose={jest.fn()} />);

    // Open modal
    const selectPhotoButton = screen.getByText("Select Photo");
    act(() => {
      fireEvent.click(selectPhotoButton);
    });

    // Toggle favorite
    const favoriteButton = screen.getByText("Toggle Favorite");
    await act(async () => {
      fireEvent.click(favoriteButton);
    });

    expect(defaultPhotoGalleryMock.handleFavoriteToggle).toHaveBeenCalledWith(
      "1",
    );
    expect(mockAddToast).toHaveBeenCalledWith({
      type: "success",
      message: "Added to favorites",
      duration: 2000,
    });
  });

  it("deletes photo from modal", async () => {
    render(<CameraApp isOpen={true} onClose={jest.fn()} />);

    // Open modal
    const selectPhotoButton = screen.getByText("Select Photo");
    act(() => {
      fireEvent.click(selectPhotoButton);
    });

    // Delete photo
    const deleteButton = screen.getByText("Delete");
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    expect(defaultPhotoGalleryMock.handlePhotoDelete).toHaveBeenCalledWith("1");
    expect(mockAddToast).toHaveBeenCalledWith({
      type: "success",
      message: "Photo deleted",
      duration: 2000,
    });

    // Modal should close after deletion
    expect(screen.queryByTestId("photo-modal")).not.toBeInTheDocument();
  });

  it("handles failed deletion", async () => {
    defaultPhotoGalleryMock.handlePhotoDelete.mockResolvedValueOnce(false);

    render(<CameraApp isOpen={true} onClose={jest.fn()} />);

    // Open modal
    const selectPhotoButton = screen.getByText("Select Photo");
    act(() => {
      fireEvent.click(selectPhotoButton);
    });

    // Try to delete photo
    const deleteButton = screen.getByText("Delete");
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    await screen.findByText("Delete"); // Wait for async operation

    expect(mockAddToast).toHaveBeenCalledWith({
      type: "error",
      message: "Failed to delete photo",
      duration: 3000,
    });

    // Modal should remain open on failure
    expect(screen.getByTestId("photo-modal")).toBeInTheDocument();
  });

  it("handles share action", () => {
    render(<CameraApp isOpen={true} onClose={jest.fn()} />);

    // Open modal
    const selectPhotoButton = screen.getByText("Select Photo");
    act(() => {
      fireEvent.click(selectPhotoButton);
    });

    // Share photo
    const shareButton = screen.getByText("Share");
    act(() => {
      fireEvent.click(shareButton);
    });

    expect(mockAddToast).toHaveBeenCalledWith({
      type: "info",
      message: "Share functionality not yet implemented",
      duration: 3000,
    });
  });

  it("closes on backdrop click", () => {
    const onClose = jest.fn();
    render(<CameraApp isOpen={true} onClose={onClose} />);

    const backdrop = screen
      .getByText("Virgil Camera")
      .closest(".camera-app-backdrop");
    fireEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalled();
  });

  it("does not close on panel click", () => {
    const onClose = jest.fn();
    render(<CameraApp isOpen={true} onClose={onClose} />);

    const panel = screen
      .getByText("Virgil Camera")
      .closest(".camera-app-panel");
    fireEvent.click(panel!);

    expect(onClose).not.toHaveBeenCalled();
  });

  it("displays photo count for gallery tab", () => {
    render(<CameraApp isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByText("3 photos")).toBeInTheDocument();
  });

  it("displays favorite count for favorites tab", () => {
    mockUsePhotoGallery.mockReturnValue({
      ...defaultPhotoGalleryMock,
      galleryState: {
        ...defaultGalleryState,
        activeTab: "favorites",
      },
    });

    render(<CameraApp isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByText("1 favorite")).toBeInTheDocument();
  });

  it("displays keyboard shortcut hint", () => {
    render(<CameraApp isOpen={true} onClose={jest.fn()} />);

    // There are multiple elements with this text, just check that at least one exists
    const shortcutHints = screen.getAllByText((_, element) => {
      return element?.textContent === "Press Esc to close";
    });
    expect(shortcutHints.length).toBeGreaterThan(0);
  });

  it("disables navigation buttons for single photo", () => {
    mockUsePhotoGallery.mockReturnValue({
      ...defaultPhotoGalleryMock,
      getCurrentPhotos: jest.fn(() => [mockPhotos[0]]), // Only one photo
    });

    render(<CameraApp isOpen={true} onClose={jest.fn()} />);

    // Open modal
    const selectPhotoButton = screen.getByText("Select Photo");
    fireEvent.click(selectPhotoButton);

    // Navigation buttons should not be present
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
    expect(screen.queryByText("Previous")).not.toBeInTheDocument();
  });
});
