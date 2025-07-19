import { render, screen, fireEvent } from "@testing-library/react";
import { PhotoGrid } from "./PhotoGrid";

const mockPhotos = [
  {
    id: "1",
    dataUrl: "data:image/jpeg;base64,photo1",
    timestamp: new Date("2024-01-20T10:00:00").getTime(),
    isFavorite: false,
    tags: ["sunset", "landscape"],
  },
  {
    id: "2",
    dataUrl: "data:image/jpeg;base64,photo2",
    timestamp: new Date("2024-01-20T11:00:00").getTime(),
    isFavorite: true,
    tags: ["portrait"],
  },
  {
    id: "3",
    dataUrl: "data:image/jpeg;base64,photo3",
    timestamp: new Date("2024-01-20T12:00:00").getTime(),
    isFavorite: false,
    tags: [],
  },
];

describe("PhotoGrid", () => {
  const mockOnPhotoClick = jest.fn();
  const mockOnPhotoSelect = jest.fn();
  const mockOnFavoriteToggle = jest.fn();
  const mockOnPhotoDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders photos grid", () => {
    render(<PhotoGrid photos={mockPhotos} onPhotoClick={mockOnPhotoClick} />);

    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  it("renders empty state when no photos", () => {
    render(<PhotoGrid photos={[]} onPhotoClick={mockOnPhotoClick} />);

    expect(screen.getByText("No photos yet")).toBeInTheDocument();
    expect(
      screen.getByText("Take a photo to get started!"),
    ).toBeInTheDocument();
  });

  it("handles photo click", () => {
    render(<PhotoGrid photos={mockPhotos} onPhotoClick={mockOnPhotoClick} />);

    const firstPhoto = screen.getAllByRole("img")[0];
    fireEvent.click(firstPhoto);

    expect(mockOnPhotoClick).toHaveBeenCalledWith(mockPhotos[0]);
  });

  it("displays favorite indicator", () => {
    render(<PhotoGrid photos={mockPhotos} onPhotoClick={mockOnPhotoClick} />);

    const favoriteIcons = screen.getAllByText("❤️");
    expect(favoriteIcons).toHaveLength(1); // Only one photo is favorited
  });

  it("shows selection mode UI", () => {
    render(
      <PhotoGrid
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
        selectionMode={true}
        selectedPhotos={new Set(["1", "3"])}
        onPhotoSelect={mockOnPhotoSelect}
      />,
    );

    // Should show checkboxes
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);

    // First and third should be checked
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).toBeChecked();
  });

  it("handles photo selection", () => {
    render(
      <PhotoGrid
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
        selectionMode={true}
        selectedPhotos={new Set()}
        onPhotoSelect={mockOnPhotoSelect}
      />,
    );

    const firstCheckbox = screen.getAllByRole("checkbox")[0];
    fireEvent.click(firstCheckbox);

    expect(mockOnPhotoSelect).toHaveBeenCalledWith("1");
  });

  it("prevents photo click in selection mode", () => {
    render(
      <PhotoGrid
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
        selectionMode={true}
        selectedPhotos={new Set()}
        onPhotoSelect={mockOnPhotoSelect}
      />,
    );

    const firstPhoto = screen.getAllByRole("img")[0];
    fireEvent.click(firstPhoto);

    expect(mockOnPhotoClick).not.toHaveBeenCalled();
  });

  it("shows hover actions when enabled", () => {
    render(
      <PhotoGrid
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
        showActions={true}
        onFavoriteToggle={mockOnFavoriteToggle}
        onPhotoDelete={mockOnPhotoDelete}
      />,
    );

    // Hover over first photo
    const firstPhotoContainer = screen
      .getAllByRole("img")[0]
      .closest(".photo-item");
    fireEvent.mouseEnter(firstPhotoContainer!);

    // Should show action buttons
    expect(screen.getByLabelText("Toggle favorite")).toBeInTheDocument();
    expect(screen.getByLabelText("Delete photo")).toBeInTheDocument();
  });

  it("handles favorite toggle", () => {
    render(
      <PhotoGrid
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
        showActions={true}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    // Hover over first photo
    const firstPhotoContainer = screen
      .getAllByRole("img")[0]
      .closest(".photo-item");
    fireEvent.mouseEnter(firstPhotoContainer!);

    // Click favorite button
    const favoriteButton = screen.getByLabelText("Toggle favorite");
    fireEvent.click(favoriteButton);

    expect(mockOnFavoriteToggle).toHaveBeenCalledWith("1");
  });

  it("handles photo delete", () => {
    render(
      <PhotoGrid
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
        showActions={true}
        onPhotoDelete={mockOnPhotoDelete}
      />,
    );

    // Hover over first photo
    const firstPhotoContainer = screen
      .getAllByRole("img")[0]
      .closest(".photo-item");
    fireEvent.mouseEnter(firstPhotoContainer!);

    // Click delete button
    const deleteButton = screen.getByLabelText("Delete photo");
    fireEvent.click(deleteButton);

    expect(mockOnPhotoDelete).toHaveBeenCalledWith("1");
  });

  it("prevents action click from triggering photo click", () => {
    render(
      <PhotoGrid
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
        showActions={true}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    // Hover over first photo
    const firstPhotoContainer = screen
      .getAllByRole("img")[0]
      .closest(".photo-item");
    fireEvent.mouseEnter(firstPhotoContainer!);

    // Click favorite button
    const favoriteButton = screen.getByLabelText("Toggle favorite");
    fireEvent.click(favoriteButton);

    expect(mockOnPhotoClick).not.toHaveBeenCalled();
  });

  it("formats photo dates correctly", () => {
    render(<PhotoGrid photos={mockPhotos} onPhotoClick={mockOnPhotoClick} />);

    // Check that dates are displayed
    expect(screen.getByText("Jan 20, 2024 10:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Jan 20, 2024 11:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Jan 20, 2024 12:00 PM")).toBeInTheDocument();
  });

  it("displays photo tags", () => {
    render(<PhotoGrid photos={mockPhotos} onPhotoClick={mockOnPhotoClick} />);

    expect(screen.getByText("sunset")).toBeInTheDocument();
    expect(screen.getByText("landscape")).toBeInTheDocument();
    expect(screen.getByText("portrait")).toBeInTheDocument();
  });

  it("applies loading state", () => {
    render(
      <PhotoGrid
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
        isLoading={true}
      />,
    );

    expect(screen.getByText("Loading photos...")).toBeInTheDocument();
  });

  it("shows custom empty message", () => {
    render(
      <PhotoGrid
        photos={[]}
        onPhotoClick={mockOnPhotoClick}
        emptyMessage="No favorites yet"
      />,
    );

    expect(screen.getByText("No favorites yet")).toBeInTheDocument();
  });

  it("applies grid layout classes", () => {
    const { container } = render(
      <PhotoGrid photos={mockPhotos} onPhotoClick={mockOnPhotoClick} />,
    );

    const grid = container.querySelector(".photo-grid");
    expect(grid).toHaveClass("photo-grid");
  });

  it("handles keyboard navigation", () => {
    render(
      <PhotoGrid
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
        selectionMode={true}
        selectedPhotos={new Set()}
        onPhotoSelect={mockOnPhotoSelect}
      />,
    );

    const firstCheckbox = screen.getAllByRole("checkbox")[0];

    // Simulate Space key
    fireEvent.keyDown(firstCheckbox, { key: " " });
    expect(mockOnPhotoSelect).toHaveBeenCalledWith("1");

    // Reset mock
    mockOnPhotoSelect.mockClear();

    // Simulate Enter key on photo (not in selection mode)
    render(
      <PhotoGrid
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
        selectionMode={false}
      />,
    );

    const firstPhoto = screen.getAllByRole("img")[0];
    fireEvent.keyDown(firstPhoto, { key: "Enter" });
    expect(mockOnPhotoClick).toHaveBeenCalledWith(mockPhotos[0]);
  });

  it("handles image load errors", () => {
    render(<PhotoGrid photos={mockPhotos} onPhotoClick={mockOnPhotoClick} />);

    const firstImage = screen.getAllByRole("img")[0];
    fireEvent.error(firstImage);

    // Should show fallback or error state
    expect(firstImage).toHaveAttribute("alt", expect.stringContaining("Photo"));
  });

  it("optimizes rendering with thumbnail images", () => {
    render(<PhotoGrid photos={mockPhotos} onPhotoClick={mockOnPhotoClick} />);

    const images = screen.getAllByRole("img");

    // Should use dataUrl for grid display
    expect(images[0]).toHaveAttribute("src", "data:image/jpeg;base64,photo1");
    expect(images[1]).toHaveAttribute("src", "data:image/jpeg;base64,photo2");
    expect(images[2]).toHaveAttribute("src", "data:image/jpeg;base64,photo3");
  });

  it("supports custom className", () => {
    const { container } = render(
      <PhotoGrid
        photos={mockPhotos}
        onPhotoClick={mockOnPhotoClick}
        className="custom-grid"
      />,
    );

    const grid = container.querySelector(".photo-grid");
    expect(grid).toHaveClass("custom-grid");
  });

  it("handles missing photo properties gracefully", () => {
    const photosWithMissingData = [
      {
        id: "1",
        dataUrl: "data:image/jpeg;base64,photo1",
        timestamp: Date.now(),
        // Missing thumbnail, isFavorite, tags
      },
    ];

    render(
      <PhotoGrid
        photos={photosWithMissingData as any}
        onPhotoClick={mockOnPhotoClick}
      />,
    );

    // Should render without errors
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});
