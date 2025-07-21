import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PhotoActions } from "./PhotoActions";
import { CameraUtils } from "./utils/cameraUtils";
import { PhotoExport } from "./utils/photoExport";
import type { SavedPhoto } from "../../types/camera.types";

// Mock dependencies
jest.mock("./utils/cameraUtils");
jest.mock("./utils/photoExport");

const mockCameraUtils = CameraUtils as jest.Mocked<typeof CameraUtils>;
const mockPhotoExport = PhotoExport as jest.Mocked<typeof PhotoExport>;

describe("PhotoActions", () => {
  const mockPhoto: SavedPhoto = {
    id: "photo-1",
    dataUrl: "data:image/jpeg;base64,test",
    timestamp: Date.now(),
    isFavorite: false,
    name: "test-photo.jpg",
    size: 102400,
    width: 1920,
    height: 1080,
    tags: ["selfie", "virgil"],
  };

  const mockOnFavoriteToggle = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCameraUtils.generatePhotoName.mockReturnValue("virgil-photo-12345.jpg");
    mockCameraUtils.formatFileSize.mockReturnValue("100 KB");
    mockCameraUtils.downloadPhoto.mockResolvedValue(undefined);
    mockPhotoExport.shareSinglePhoto.mockResolvedValue(undefined);
  });

  it("renders all action buttons", () => {
    render(
      <PhotoActions
        photo={mockPhoto}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByTitle("Add to favorites")).toBeInTheDocument();
    expect(screen.getByTitle("Download photo")).toBeInTheDocument();
    expect(screen.getByTitle("Share photo")).toBeInTheDocument();
    expect(screen.getByTitle("Delete photo")).toBeInTheDocument();
  });

  it("displays photo metadata", () => {
    render(
      <PhotoActions
        photo={mockPhoto}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
      />,
    );

    // Check date and time
    const date = new Date(mockPhoto.timestamp);
    expect(screen.getByText(date.toLocaleDateString())).toBeInTheDocument();
    expect(screen.getByText(date.toLocaleTimeString())).toBeInTheDocument();

    // Check size
    expect(screen.getByText("100 KB")).toBeInTheDocument();

    // Check dimensions
    expect(screen.getByText("1920 × 1080")).toBeInTheDocument();

    // Check name
    expect(screen.getByText("test-photo.jpg")).toBeInTheDocument();

    // Check tags
    expect(screen.getByText("selfie")).toBeInTheDocument();
    expect(screen.getByText("virgil")).toBeInTheDocument();
  });

  it("toggles favorite status", () => {
    render(
      <PhotoActions
        photo={mockPhoto}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
      />,
    );

    const favoriteButton = screen.getByTitle("Add to favorites");
    fireEvent.click(favoriteButton);

    expect(mockOnFavoriteToggle).toHaveBeenCalledWith("photo-1");
  });

  it("shows favorited state", () => {
    const favoritedPhoto = { ...mockPhoto, isFavorite: true };

    render(
      <PhotoActions
        photo={favoritedPhoto}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
      />,
    );

    const favoriteButton = screen.getByTitle("Remove from favorites");
    expect(favoriteButton).toHaveClass("favorited");
    expect(screen.getByText("Favorited")).toBeInTheDocument();
    expect(screen.getByText("❤️")).toBeInTheDocument();
  });

  it("downloads photo", async () => {
    render(
      <PhotoActions
        photo={mockPhoto}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
      />,
    );

    const downloadButton = screen.getByTitle("Download photo");
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockCameraUtils.downloadPhoto).toHaveBeenCalledWith(
        "data:image/jpeg;base64,test",
        "test-photo.jpg",
      );
    });
  });

  it("uses generated filename when photo has no name", async () => {
    const photoWithoutName = { ...mockPhoto, name: undefined };

    render(
      <PhotoActions
        photo={photoWithoutName}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
      />,
    );

    const downloadButton = screen.getByTitle("Download photo");
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(mockCameraUtils.generatePhotoName).toHaveBeenCalledWith(
        mockPhoto.timestamp,
      );
      expect(mockCameraUtils.downloadPhoto).toHaveBeenCalledWith(
        "data:image/jpeg;base64,test",
        "virgil-photo-12345.jpg",
      );
    });
  });

  it("shares photo", async () => {
    render(
      <PhotoActions
        photo={mockPhoto}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
      />,
    );

    const shareButton = screen.getByTitle("Share photo");
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockPhotoExport.shareSinglePhoto).toHaveBeenCalledWith(mockPhoto);
    });
  });

  it("falls back to download when share fails", async () => {
    mockPhotoExport.shareSinglePhoto.mockRejectedValueOnce(
      new Error("Share failed"),
    );

    render(
      <PhotoActions
        photo={mockPhoto}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
      />,
    );

    const shareButton = screen.getByTitle("Share photo");
    fireEvent.click(shareButton);

    await waitFor(() => {
      expect(mockPhotoExport.shareSinglePhoto).toHaveBeenCalledWith(mockPhoto);
      expect(mockCameraUtils.downloadPhoto).toHaveBeenCalled();
    });
  });

  it("shows delete confirmation dialog", () => {
    render(
      <PhotoActions
        photo={mockPhoto}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
      />,
    );

    const deleteButton = screen.getByTitle("Delete photo");
    fireEvent.click(deleteButton);

    expect(screen.getByText("Delete Photo?")).toBeInTheDocument();
    expect(
      screen.getByText("This action cannot be undone."),
    ).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("cancels delete action", () => {
    render(
      <PhotoActions
        photo={mockPhoto}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
      />,
    );

    // Show delete confirmation
    const deleteButton = screen.getByTitle("Delete photo");
    fireEvent.click(deleteButton);

    // Cancel
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    // Should go back to normal view
    expect(screen.queryByText("Delete Photo?")).not.toBeInTheDocument();
    expect(screen.getByTitle("Delete photo")).toBeInTheDocument();
  });

  it("confirms delete action", () => {
    render(
      <PhotoActions
        photo={mockPhoto}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />,
    );

    // Show delete confirmation
    const deleteButton = screen.getByTitle("Delete photo");
    fireEvent.click(deleteButton);

    // Confirm delete
    const confirmButton = screen.getByText("Delete");
    fireEvent.click(confirmButton);

    expect(mockOnDelete).toHaveBeenCalledWith("photo-1");
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("disables buttons while processing", async () => {
    mockCameraUtils.downloadPhoto.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(
      <PhotoActions
        photo={mockPhoto}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
      />,
    );

    const downloadButton = screen.getByTitle("Download photo");
    fireEvent.click(downloadButton);

    // All buttons should be disabled while processing
    expect(screen.getByTitle("Add to favorites")).toBeDisabled();
    expect(screen.getByTitle("Download photo")).toBeDisabled();
    expect(screen.getByTitle("Share photo")).toBeDisabled();
    expect(screen.getByTitle("Delete photo")).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByTitle("Add to favorites")).not.toBeDisabled();
    });
  });

  it("handles download errors gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    mockCameraUtils.downloadPhoto.mockRejectedValueOnce(
      new Error("Download failed"),
    );

    render(
      <PhotoActions
        photo={mockPhoto}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
      />,
    );

    const downloadButton = screen.getByTitle("Download photo");
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error downloading photo:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("handles photos without optional metadata", () => {
    const minimalPhoto: SavedPhoto = {
      id: "photo-2",
      dataUrl: "data:image/jpeg;base64,test",
      timestamp: Date.now(),
      isFavorite: false,
    };

    render(
      <PhotoActions
        photo={minimalPhoto}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
      />,
    );

    // Should not show optional fields
    expect(screen.queryByText("Size:")).not.toBeInTheDocument();
    expect(screen.queryByText("Dimensions:")).not.toBeInTheDocument();
    expect(screen.queryByText("Name:")).not.toBeInTheDocument();
    expect(screen.queryByText("Tags:")).not.toBeInTheDocument();

    // But should still show date and time
    const date = new Date(minimalPhoto.timestamp);
    expect(screen.getByText(date.toLocaleDateString())).toBeInTheDocument();
    expect(screen.getByText(date.toLocaleTimeString())).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <PhotoActions
        photo={mockPhoto}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
        className="custom-actions"
      />,
    );

    const actionsContainer = document.querySelector(".photo-actions");
    expect(actionsContainer).toHaveClass("custom-actions");
  });

  it("applies custom className to delete confirm dialog", () => {
    render(
      <PhotoActions
        photo={mockPhoto}
        onFavoriteToggle={mockOnFavoriteToggle}
        onDelete={mockOnDelete}
        className="custom-actions"
      />,
    );

    // Show delete confirmation
    const deleteButton = screen.getByTitle("Delete photo");
    fireEvent.click(deleteButton);

    const confirmDialog = document.querySelector(
      ".photo-actions.delete-confirm",
    );
    expect(confirmDialog).toHaveClass("custom-actions");
  });
});
