import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NasaApodViewer } from "./NasaApodViewer";
import { getNasaApod, searchNasaImages } from "../../lib/nasaService";

// Mock NASA service
jest.mock("../../lib/nasaService");

// Mock child components
jest.mock("./NasaApodModal", () => ({
  NasaApodModal: ({ apod, isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="nasa-modal">
        <h2>{apod.title}</h2>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

jest.mock("./NasaApodGallery", () => ({
  NasaApodGallery: ({ images, onImageClick }: any) => (
    <div data-testid="nasa-gallery">
      {images.map((img: any) => (
        <div key={img.date} onClick={() => onImageClick(img)}>
          {img.title}
        </div>
      ))}
    </div>
  ),
}));

const mockGetNasaApod = getNasaApod as jest.MockedFunction<typeof getNasaApod>;
const mockSearchNasaImages = searchNasaImages as jest.MockedFunction<
  typeof searchNasaImages
>;

const mockApod = {
  date: "2024-01-15",
  title: "Amazing Space Photo",
  explanation: "This is an amazing photo of space",
  url: "https://example.com/space.jpg",
  hdurl: "https://example.com/space-hd.jpg",
  media_type: "image" as const,
  copyright: "NASA",
};

const mockSearchResults = [
  {
    date: "2024-01-14",
    title: "Galaxy Photo",
    explanation: "A beautiful galaxy",
    url: "https://example.com/galaxy.jpg",
    media_type: "image" as const,
  },
  {
    date: "2024-01-13",
    title: "Nebula Photo",
    explanation: "A colorful nebula",
    url: "https://example.com/nebula.jpg",
    media_type: "image" as const,
  },
];

describe("NasaApodViewer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNasaApod.mockResolvedValue(mockApod);
    mockSearchNasaImages.mockResolvedValue(mockSearchResults);
  });

  it("renders when open", () => {
    render(<NasaApodViewer isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/nasa/i)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<NasaApodViewer isOpen={false} onClose={jest.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();
    render(<NasaApodViewer isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("loads and displays APOD on mount", async () => {
    render(<NasaApodViewer isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetNasaApod).toHaveBeenCalled();
      expect(screen.getByText(mockApod.title)).toBeInTheDocument();
    });
  });

  it("opens modal when image is clicked", async () => {
    render(<NasaApodViewer isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(mockApod.title)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(mockApod.title));

    expect(screen.getByTestId("nasa-modal")).toBeInTheDocument();
  });

  it("closes modal", async () => {
    render(<NasaApodViewer isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(mockApod.title)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(mockApod.title));

    const modalCloseButton = screen.getByText("Close");
    fireEvent.click(modalCloseButton);

    expect(screen.queryByTestId("nasa-modal")).not.toBeInTheDocument();
  });

  it("searches for images", async () => {
    render(<NasaApodViewer isOpen={true} onClose={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    const searchButton = screen.getByRole("button", { name: /search/i });

    fireEvent.change(searchInput, { target: { value: "galaxy" } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(mockSearchNasaImages).toHaveBeenCalledWith("galaxy");
      expect(screen.getByText("Galaxy Photo")).toBeInTheDocument();
      expect(screen.getByText("Nebula Photo")).toBeInTheDocument();
    });
  });

  it("handles search with enter key", async () => {
    render(<NasaApodViewer isOpen={true} onClose={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText(/search/i);

    fireEvent.change(searchInput, { target: { value: "mars" } });
    fireEvent.keyPress(searchInput, { key: "Enter", code: 13, charCode: 13 });

    await waitFor(() => {
      expect(mockSearchNasaImages).toHaveBeenCalledWith("mars");
    });
  });

  it("shows error state when APOD fails to load", async () => {
    mockGetNasaApod.mockRejectedValueOnce(new Error("API Error"));

    render(<NasaApodViewer isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/error.*loading/i)).toBeInTheDocument();
    });
  });

  it("shows error state when search fails", async () => {
    mockSearchNasaImages.mockRejectedValueOnce(new Error("Search failed"));

    render(<NasaApodViewer isOpen={true} onClose={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    const searchButton = screen.getByRole("button", { name: /search/i });

    fireEvent.change(searchInput, { target: { value: "test" } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/error.*search/i)).toBeInTheDocument();
    });
  });

  it("switches between tabs", async () => {
    render(<NasaApodViewer isOpen={true} onClose={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(mockApod.title)).toBeInTheDocument();
    });

    // Switch to favorites tab
    const favoritesTab = screen.getByRole("button", { name: /favorites/i });
    fireEvent.click(favoritesTab);

    expect(screen.getByText(/no favorite/i)).toBeInTheDocument();

    // Switch back to today tab
    const todayTab = screen.getByRole("button", { name: /today/i });
    fireEvent.click(todayTab);

    expect(screen.getByText(mockApod.title)).toBeInTheDocument();
  });

  it("loads images by date range", async () => {
    render(<NasaApodViewer isOpen={true} onClose={jest.fn()} />);

    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);
    const loadButton = screen.getByRole("button", { name: /load images/i });

    fireEvent.change(startDateInput, { target: { value: "2024-01-01" } });
    fireEvent.change(endDateInput, { target: { value: "2024-01-07" } });
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(mockGetNasaApod).toHaveBeenCalledWith(
        expect.objectContaining({
          start_date: "2024-01-01",
          end_date: "2024-01-07",
        }),
      );
    });
  });

  it("shows loading state during search", async () => {
    // Make search take some time
    mockSearchNasaImages.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(mockSearchResults), 100),
        ),
    );

    render(<NasaApodViewer isOpen={true} onClose={jest.fn()} />);

    const searchButton = screen.getByRole("button", { name: /search/i });
    fireEvent.click(searchButton);

    expect(screen.getByText(/searching/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/searching/i)).not.toBeInTheDocument();
    });
  });

  it("handles empty search results", async () => {
    mockSearchNasaImages.mockResolvedValueOnce([]);

    render(<NasaApodViewer isOpen={true} onClose={jest.fn()} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    const searchButton = screen.getByRole("button", { name: /search/i });

    fireEvent.change(searchInput, { target: { value: "xyz123" } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    });
  });
});
