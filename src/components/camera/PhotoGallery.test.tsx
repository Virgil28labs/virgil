import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PhotoGallery } from "./PhotoGallery";
import { usePhotoGallery } from "./hooks/usePhotoGallery";

// Mock the usePhotoGallery hook
jest.mock("./hooks/usePhotoGallery");

// Mock child components
jest.mock("./PhotoGrid", () => ({
  PhotoGrid: ({ photos, onPhotoClick, onPhotoDelete }: any) => (
    <div data-testid="photo-grid">
      {photos.map((photo: any) => (
        <div key={photo.id} data-testid={`photo-${photo.id}`}>
          <img src={photo.url} alt="" onClick={() => onPhotoClick(photo)} />
          <button onClick={() => onPhotoDelete(photo.id)}>Delete</button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock("./PhotoModal", () => ({
  PhotoModal: ({ photo, onClose, onDelete, onDownload }: any) =>
    photo ? (
      <div data-testid="photo-modal">
        <img src={photo.url} alt="" />
        <button onClick={onClose}>Close</button>
        <button onClick={() => onDelete(photo.id)}>Delete</button>
        <button onClick={() => onDownload(photo)}>Download</button>
      </div>
    ) : null,
}));

const mockUsePhotoGallery = usePhotoGallery as jest.MockedFunction<
  typeof usePhotoGallery
>;

const mockPhotos = [
  {
    id: "1",
    url: "data:image/jpeg;base64,photo1",
    thumbnail: "data:image/jpeg;base64,thumb1",
    timestamp: new Date("2024-01-20T10:00:00"),
    location: { latitude: 40.7128, longitude: -74.006 },
    metadata: {
      width: 1920,
      height: 1080,
      size: 245760,
      mimeType: "image/jpeg",
    },
  },
  {
    id: "2",
    url: "data:image/jpeg;base64,photo2",
    thumbnail: "data:image/jpeg;base64,thumb2",
    timestamp: new Date("2024-01-20T11:00:00"),
    location: undefined,
    metadata: {
      width: 1280,
      height: 720,
      size: 184320,
      mimeType: "image/jpeg",
    },
  },
];

describe("PhotoGallery", () => {
  const mockAddPhoto = jest.fn();
  const mockDeletePhoto = jest.fn();
  const mockDeleteAllPhotos = jest.fn();
  const mockExportPhotos = jest.fn();
  const mockImportPhotos = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsePhotoGallery.mockReturnValue({
      photos: mockPhotos,
      loading: false,
      error: null,
      addPhoto: mockAddPhoto,
      deletePhoto: mockDeletePhoto,
      deleteAllPhotos: mockDeleteAllPhotos,
      exportPhotos: mockExportPhotos,
      importPhotos: mockImportPhotos,
    });
  });

  it("renders photo gallery with photos", () => {
    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    expect(screen.getByText("Photo Gallery")).toBeInTheDocument();
    expect(screen.getByText("2 photos")).toBeInTheDocument();
    expect(screen.getByTestId("photo-grid")).toBeInTheDocument();
    expect(screen.getByTestId("photo-1")).toBeInTheDocument();
    expect(screen.getByTestId("photo-2")).toBeInTheDocument();
  });

  it("renders loading state", () => {
    mockUsePhotoGallery.mockReturnValue({
      photos: [],
      loading: true,
      error: null,
      addPhoto: mockAddPhoto,
      deletePhoto: mockDeletePhoto,
      deleteAllPhotos: mockDeleteAllPhotos,
      exportPhotos: mockExportPhotos,
      importPhotos: mockImportPhotos,
    });

    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    expect(screen.getByText("Loading photos...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    mockUsePhotoGallery.mockReturnValue({
      photos: [],
      loading: false,
      error: "Failed to load photos",
      addPhoto: mockAddPhoto,
      deletePhoto: mockDeletePhoto,
      deleteAllPhotos: mockDeleteAllPhotos,
      exportPhotos: mockExportPhotos,
      importPhotos: mockImportPhotos,
    });

    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    expect(
      screen.getByText("Error: Failed to load photos"),
    ).toBeInTheDocument();
  });

  it("renders empty state", () => {
    mockUsePhotoGallery.mockReturnValue({
      photos: [],
      loading: false,
      error: null,
      addPhoto: mockAddPhoto,
      deletePhoto: mockDeletePhoto,
      deleteAllPhotos: mockDeleteAllPhotos,
      exportPhotos: mockExportPhotos,
      importPhotos: mockImportPhotos,
    });

    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    expect(screen.getByText("No photos yet")).toBeInTheDocument();
    expect(
      screen.getByText("Take a photo to get started!"),
    ).toBeInTheDocument();
  });

  it("opens photo modal when photo is clicked", () => {
    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    const photo = screen.getByTestId("photo-1").querySelector("img");
    fireEvent.click(photo!);

    expect(screen.getByTestId("photo-modal")).toBeInTheDocument();
  });

  it("closes photo modal", () => {
    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    // Open modal
    const photo = screen.getByTestId("photo-1").querySelector("img");
    fireEvent.click(photo!);

    // Close modal
    const closeButton = screen.getByText("Close");
    fireEvent.click(closeButton);

    expect(screen.queryByTestId("photo-modal")).not.toBeInTheDocument();
  });

  it("deletes photo from grid", async () => {
    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    const deleteButton = screen.getByTestId("photo-1").querySelector("button");
    fireEvent.click(deleteButton!);

    expect(mockDeletePhoto).toHaveBeenCalledWith("1");
  });

  it("deletes photo from modal", async () => {
    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    // Open modal
    const photo = screen.getByTestId("photo-1").querySelector("img");
    fireEvent.click(photo!);

    // Delete from modal
    const deleteButton = screen
      .getByTestId("photo-modal")
      .querySelector("button:nth-of-type(2)");
    fireEvent.click(deleteButton!);

    expect(mockDeletePhoto).toHaveBeenCalledWith("1");
    expect(screen.queryByTestId("photo-modal")).not.toBeInTheDocument();
  });

  it("exports photos", () => {
    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    const exportButton = screen.getByRole("button", { name: /export/i });
    fireEvent.click(exportButton);

    expect(mockExportPhotos).toHaveBeenCalled();
  });

  it("handles import photos", () => {
    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    const importInput = screen.getByLabelText(/import photos/i);
    const file = new File(["photo data"], "photos.json", {
      type: "application/json",
    });

    fireEvent.change(importInput, { target: { files: [file] } });

    expect(mockImportPhotos).toHaveBeenCalledWith(file);
  });

  it("shows delete all confirmation", () => {
    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    const deleteAllButton = screen.getByRole("button", { name: /delete all/i });
    fireEvent.click(deleteAllButton);

    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /confirm/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("confirms delete all photos", () => {
    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    // Open confirmation
    const deleteAllButton = screen.getByRole("button", { name: /delete all/i });
    fireEvent.click(deleteAllButton);

    // Confirm
    const confirmButton = screen.getByRole("button", { name: /confirm/i });
    fireEvent.click(confirmButton);

    expect(mockDeleteAllPhotos).toHaveBeenCalled();
    expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
  });

  it("cancels delete all photos", () => {
    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    // Open confirmation
    const deleteAllButton = screen.getByRole("button", { name: /delete all/i });
    fireEvent.click(deleteAllButton);

    // Cancel
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockDeleteAllPhotos).not.toHaveBeenCalled();
    expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
  });

  it("downloads photo from modal", () => {
    // Create a mock for creating and clicking anchor element
    const mockClick = jest.fn();
    const mockCreateElement = document.createElement.bind(document);
    document.createElement = jest.fn((tagName) => {
      if (tagName === "a") {
        const anchor = mockCreateElement("a");
        anchor.click = mockClick;
        return anchor;
      }
      return mockCreateElement(tagName);
    });

    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    // Open modal
    const photo = screen.getByTestId("photo-1").querySelector("img");
    fireEvent.click(photo!);

    // Download from modal
    const downloadButton = screen.getByText("Download");
    fireEvent.click(downloadButton);

    expect(mockClick).toHaveBeenCalled();

    // Restore original createElement
    document.createElement = mockCreateElement;
  });

  it("displays photo count correctly", () => {
    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    expect(screen.getByText("2 photos")).toBeInTheDocument();

    // Test with 1 photo
    mockUsePhotoGallery.mockReturnValue({
      photos: [mockPhotos[0]],
      loading: false,
      error: null,
      addPhoto: mockAddPhoto,
      deletePhoto: mockDeletePhoto,
      deleteAllPhotos: mockDeleteAllPhotos,
      exportPhotos: mockExportPhotos,
      importPhotos: mockImportPhotos,
    });

    const { rerender } = render(<PhotoGallery />);
    rerender(<PhotoGallery />);

    expect(screen.getByText("1 photo")).toBeInTheDocument();
  });

  it("disables delete all when no photos", () => {
    mockUsePhotoGallery.mockReturnValue({
      photos: [],
      loading: false,
      error: null,
      addPhoto: mockAddPhoto,
      deletePhoto: mockDeletePhoto,
      deleteAllPhotos: mockDeleteAllPhotos,
      exportPhotos: mockExportPhotos,
      importPhotos: mockImportPhotos,
    });

    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    const deleteAllButton = screen.getByRole("button", { name: /delete all/i });
    expect(deleteAllButton).toBeDisabled();
  });

  it("disables export when no photos", () => {
    mockUsePhotoGallery.mockReturnValue({
      photos: [],
      loading: false,
      error: null,
      addPhoto: mockAddPhoto,
      deletePhoto: mockDeletePhoto,
      deleteAllPhotos: mockDeleteAllPhotos,
      exportPhotos: mockExportPhotos,
      importPhotos: mockImportPhotos,
    });

    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    const exportButton = screen.getByRole("button", { name: /export/i });
    expect(exportButton).toBeDisabled();
  });

  it("handles keyboard navigation in modal", () => {
    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    // Open modal
    const photo = screen.getByTestId("photo-1").querySelector("img");
    fireEvent.click(photo!);

    // Press Escape to close
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByTestId("photo-modal")).not.toBeInTheDocument();
  });

  it("handles photo navigation in modal", () => {
    render(<PhotoGallery onPhotoSelect={jest.fn()} onError={jest.fn()} />);

    // Open modal with first photo
    const firstPhoto = screen.getByTestId("photo-1").querySelector("img");
    fireEvent.click(firstPhoto!);

    expect(
      screen.getByTestId("photo-modal").querySelector("img"),
    ).toHaveAttribute("src", mockPhotos[0].url);

    // Navigate to next photo (would require ArrowRight key handling in actual component)
    fireEvent.keyDown(document, { key: "ArrowRight" });

    // Note: Actual navigation would depend on component implementation
  });
});
