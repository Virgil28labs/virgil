import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GiphyGallery } from "./GiphyGallery";
import { useGiphyGallery } from "./GiphyGalleryProvider";
import type { GiphyImage } from "../../types";

// Mock sub-components
jest.mock("./GiphyTabs", () => ({
  GiphyTabs: ({ currentTab, onTabChange }: any) => (
    <div data-testid="giphy-tabs">
      <button onClick={() => onTabChange("search")}>
        Search ({currentTab === "search" ? "active" : ""})
      </button>
      <button onClick={() => onTabChange("trending")}>Trending</button>
      <button onClick={() => onTabChange("favorites")}>Favorites</button>
    </div>
  ),
}));

jest.mock("./GiphySearchControls", () => ({
  GiphySearchControls: ({ searchQuery, onSearchChange, onSearch }: any) => (
    <div data-testid="giphy-search-controls">
      <input
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search GIFs"
      />
      <button onClick={onSearch}>Search</button>
    </div>
  ),
}));

jest.mock("./GiphyGrid", () => ({
  GiphyGrid: ({
    gifs,
    loading,
    error,
    onImageClick,
    onFavoriteToggle,
    isFavorited,
  }: any) => (
    <div data-testid="giphy-grid">
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {gifs.map((gif: any, index: number) => (
        <div key={gif.id} onClick={() => onImageClick(index)}>
          <img src={gif.url} alt={gif.title} />
          <button onClick={() => onFavoriteToggle(gif)}>
            {isFavorited(gif) ? "Unfavorite" : "Favorite"}
          </button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock("./GiphyModal", () => ({
  GiphyModal: ({ gifs, currentIndex, onClose, onNavigate }: any) => (
    <div data-testid="giphy-modal">
      <img src={gifs[currentIndex].url} alt={gifs[currentIndex].title} />
      <button onClick={onClose}>Close Modal</button>
      <button onClick={() => onNavigate((currentIndex + 1) % gifs.length)}>
        Next
      </button>
    </div>
  ),
}));

// Mock the context hook
jest.mock("./GiphyGalleryProvider", () => {
  const actualModule = jest.requireActual("./GiphyGalleryProvider");
  return {
    ...actualModule,
    useGiphyGallery: jest.fn(),
  };
});

const mockUseGiphyGallery = useGiphyGallery as jest.MockedFunction<
  typeof useGiphyGallery
>;

describe("GiphyGallery", () => {
  const mockOnClose = jest.fn();

  const mockGifs: GiphyImage[] = [
    {
      id: "1",
      url: "gif1.gif",
      previewUrl: "preview1.gif",
      title: "GIF 1",
      width: 300,
      height: 200,
    },
    {
      id: "2",
      url: "gif2.gif",
      previewUrl: "preview2.gif",
      title: "GIF 2",
      width: 300,
      height: 200,
    },
  ];

  const defaultMockContext = {
    searchResults: [],
    trendingGifs: mockGifs,
    favorites: [],
    searchQuery: "",
    currentTab: "trending" as const,
    rating: "g" as const,
    loading: "idle" as const,
    error: null,
    search: jest.fn(),
    setSearchQuery: jest.fn(),
    setCurrentTab: jest.fn(),
    setRating: jest.fn(),
    toggleFavorite: jest.fn(),
    isFavorited: jest.fn(() => false),
    clearError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGiphyGallery.mockReturnValue(defaultMockContext);
  });

  it("renders when open", () => {
    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("GIPHY Gifs")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<GiphyGallery isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClose when close button clicked", () => {
    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText("Close gallery");
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", () => {
    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    const backdrop = screen.getByRole("dialog");
    fireEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("prevents closing when panel clicked", () => {
    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    const panel = screen.getByRole("document");
    fireEvent.click(panel);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("handles Escape key to close gallery", () => {
    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("renders tabs", () => {
    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByTestId("giphy-tabs")).toBeInTheDocument();
  });

  it("shows search controls only on search tab", () => {
    const { rerender } = render(
      <GiphyGallery isOpen={true} onClose={mockOnClose} />,
    );

    // Should not show on trending tab
    expect(
      screen.queryByTestId("giphy-search-controls"),
    ).not.toBeInTheDocument();

    // Change to search tab
    mockUseGiphyGallery.mockReturnValue({
      ...defaultMockContext,
      currentTab: "search",
    });

    rerender(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByTestId("giphy-search-controls")).toBeInTheDocument();
  });

  it("performs search when search button clicked", () => {
    const mockSearch = jest.fn();
    mockUseGiphyGallery.mockReturnValue({
      ...defaultMockContext,
      currentTab: "search",
      searchQuery: "cats",
      search: mockSearch,
    });

    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    expect(mockSearch).toHaveBeenCalledWith("cats");
    expect(defaultMockContext.setCurrentTab).toHaveBeenCalledWith("search");
  });

  it("handles Enter key for search", () => {
    const mockSearch = jest.fn();
    mockUseGiphyGallery.mockReturnValue({
      ...defaultMockContext,
      currentTab: "search",
      searchQuery: "dogs",
      search: mockSearch,
    });

    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, {
      key: "Enter",
      target: dialog,
      currentTarget: dialog,
    });

    expect(mockSearch).toHaveBeenCalledWith("dogs");
  });

  it("does not search with empty query", () => {
    const mockSearch = jest.fn();
    mockUseGiphyGallery.mockReturnValue({
      ...defaultMockContext,
      currentTab: "search",
      searchQuery: "  ",
      search: mockSearch,
    });

    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    const searchButton = screen.getByText("Search");
    fireEvent.click(searchButton);

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("displays error message", () => {
    mockUseGiphyGallery.mockReturnValue({
      ...defaultMockContext,
      error: "Failed to load GIFs",
    });

    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("⚠️")).toBeInTheDocument();
    expect(screen.getByText("Failed to load GIFs")).toBeInTheDocument();
  });

  it("clears error when dismiss clicked", () => {
    const mockClearError = jest.fn();
    mockUseGiphyGallery.mockReturnValue({
      ...defaultMockContext,
      error: "Error occurred",
      clearError: mockClearError,
    });

    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    const dismissButton = screen.getByText("Dismiss");
    fireEvent.click(dismissButton);

    expect(mockClearError).toHaveBeenCalled();
  });

  it("opens modal when image clicked", () => {
    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    const firstGif = screen.getByAltText("GIF 1");
    fireEvent.click(firstGif.parentElement!);

    expect(screen.getByTestId("giphy-modal")).toBeInTheDocument();
  });

  it("closes modal when modal close clicked", () => {
    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    // Open modal
    const firstGif = screen.getByAltText("GIF 1");
    fireEvent.click(firstGif.parentElement!);

    // Close modal
    const closeModalButton = screen.getByText("Close Modal");
    fireEvent.click(closeModalButton);

    expect(screen.queryByTestId("giphy-modal")).not.toBeInTheDocument();
  });

  it("closes modal on Escape key", () => {
    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    // Open modal
    const firstGif = screen.getByAltText("GIF 1");
    fireEvent.click(firstGif.parentElement!);

    // Press Escape
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect(screen.queryByTestId("giphy-modal")).not.toBeInTheDocument();
    expect(mockOnClose).not.toHaveBeenCalled(); // Should close modal, not gallery
  });

  it("shows empty state for search tab", () => {
    mockUseGiphyGallery.mockReturnValue({
      ...defaultMockContext,
      currentTab: "search",
      searchResults: [],
    });

    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("🔍")).toBeInTheDocument();
    expect(screen.getByText("No search results")).toBeInTheDocument();
    expect(
      screen.getByText("Enter a search term to find GIFs"),
    ).toBeInTheDocument();
  });

  it("shows empty state for search with query", () => {
    mockUseGiphyGallery.mockReturnValue({
      ...defaultMockContext,
      currentTab: "search",
      searchResults: [],
      searchQuery: "unicorns",
    });

    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    expect(
      screen.getByText(
        'No GIFs found for "unicorns". Try a different search term.',
      ),
    ).toBeInTheDocument();
  });

  it("shows empty state for trending tab", () => {
    mockUseGiphyGallery.mockReturnValue({
      ...defaultMockContext,
      trendingGifs: [],
    });

    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("🔥")).toBeInTheDocument();
    expect(screen.getByText("No trending GIFs")).toBeInTheDocument();
  });

  it("shows empty state for favorites tab", () => {
    mockUseGiphyGallery.mockReturnValue({
      ...defaultMockContext,
      currentTab: "favorites",
      favorites: [],
    });

    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("❤️")).toBeInTheDocument();
    expect(screen.getByText("No favorites yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Save GIFs to your favorites by clicking the heart icon",
      ),
    ).toBeInTheDocument();
  });

  it("toggles favorite when favorite button clicked", () => {
    const mockToggleFavorite = jest.fn();
    mockUseGiphyGallery.mockReturnValue({
      ...defaultMockContext,
      toggleFavorite: mockToggleFavorite,
    });

    render(<GiphyGallery isOpen={true} onClose={mockOnClose} />);

    const favoriteButton = screen.getAllByText("Favorite")[0];
    fireEvent.click(favoriteButton);

    expect(mockToggleFavorite).toHaveBeenCalledWith(mockGifs[0]);
  });

  it("displays correct GIFs based on current tab", () => {
    const searchGifs = [
      {
        id: "s1",
        url: "search1.gif",
        previewUrl: "spreview1.gif",
        title: "Search GIF",
        width: 300,
        height: 200,
      },
    ];

    const favoriteGifs = [
      {
        id: "f1",
        url: "fav1.gif",
        previewUrl: "fpreview1.gif",
        title: "Favorite GIF",
        width: 300,
        height: 200,
      },
    ];

    // Test search tab
    mockUseGiphyGallery.mockReturnValue({
      ...defaultMockContext,
      currentTab: "search",
      searchResults: searchGifs,
    });

    const { rerender } = render(
      <GiphyGallery isOpen={true} onClose={mockOnClose} />,
    );
    expect(screen.getByAltText("Search GIF")).toBeInTheDocument();

    // Test favorites tab
    mockUseGiphyGallery.mockReturnValue({
      ...defaultMockContext,
      currentTab: "favorites",
      favorites: favoriteGifs,
    });

    rerender(<GiphyGallery isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByAltText("Favorite GIF")).toBeInTheDocument();
  });
});
