import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GiphyCard } from "./GiphyCard";
import { giphyService } from "../../lib/giphyService";
import type { GiphyGif } from "../../types";

// Mock the giphyService
jest.mock("../../lib/giphyService");

const mockGiphyService = giphyService as jest.Mocked<typeof giphyService>;

describe("GiphyCard", () => {
  const mockGif: GiphyGif = {
    id: "gif-123",
    title: "Funny Cat GIF",
    url: "https://example.com/gif.gif",
    previewUrl: "https://example.com/preview.gif",
    width: 300,
    height: 200,
    username: "testuser",
    size: 1024000,
  };

  const mockOnImageClick = jest.fn();
  const mockOnFavoriteToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("renders GIF with preview image initially", () => {
    render(
      <GiphyCard
        gif={mockGif}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const img = screen.getByAltText("Funny Cat GIF");
    expect(img).toHaveAttribute("src", mockGif.previewUrl);
  });

  it("shows loading skeleton before image loads", () => {
    render(
      <GiphyCard
        gif={mockGif}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    expect(document.querySelector(".giphy-image-skeleton")).toBeInTheDocument();
  });

  it("hides skeleton when image loads", () => {
    render(
      <GiphyCard
        gif={mockGif}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const img = screen.getByAltText("Funny Cat GIF");
    fireEvent.load(img);

    expect(
      document.querySelector(".giphy-image-skeleton"),
    ).not.toBeInTheDocument();
    expect(img).toHaveStyle({ opacity: "1" });
  });

  it("shows error state when image fails to load", () => {
    render(
      <GiphyCard
        gif={mockGif}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const img = screen.getByAltText("Funny Cat GIF");
    fireEvent.error(img);

    expect(screen.getByText("🖼️")).toBeInTheDocument();
    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("switches to full URL on hover", () => {
    render(
      <GiphyCard
        gif={mockGif}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const container = document.querySelector(".giphy-grid-item");
    const img = screen.getByAltText("Funny Cat GIF");

    expect(img).toHaveAttribute("src", mockGif.previewUrl);

    fireEvent.mouseEnter(container!);
    expect(img).toHaveAttribute("src", mockGif.url);

    fireEvent.mouseLeave(container!);
    expect(img).toHaveAttribute("src", mockGif.previewUrl);
  });

  it("shows GIF info overlay on hover", () => {
    render(
      <GiphyCard
        gif={mockGif}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const container = document.querySelector(".giphy-grid-item");
    const img = screen.getByAltText("Funny Cat GIF");

    // Load image first
    fireEvent.load(img);

    const infoOverlay = document.querySelector(".giphy-info-overlay");
    expect(infoOverlay).toHaveStyle({ opacity: "0" });

    fireEvent.mouseEnter(container!);
    expect(infoOverlay).toHaveStyle({ opacity: "1" });
    expect(screen.getByText("Funny Cat GIF")).toBeInTheDocument();
    expect(screen.getByText("by testuser")).toBeInTheDocument();
  });

  it("calls onImageClick when clicked", () => {
    render(
      <GiphyCard
        gif={mockGif}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const container = document.querySelector(".giphy-grid-item");
    fireEvent.click(container!);

    expect(mockOnImageClick).toHaveBeenCalled();
  });

  it("toggles favorite when favorite button clicked", () => {
    render(
      <GiphyCard
        gif={mockGif}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const favoriteButton = screen.getByLabelText("Add to favorites");
    fireEvent.click(favoriteButton);

    expect(mockOnFavoriteToggle).toHaveBeenCalled();
    expect(mockOnImageClick).not.toHaveBeenCalled();
  });

  it("shows favorited state", () => {
    render(
      <GiphyCard
        gif={mockGif}
        index={0}
        isFavorited={true}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const favoriteButton = screen.getByLabelText("Remove from favorites");
    expect(favoriteButton).toHaveClass("favorited");
    expect(screen.getByText("❤️")).toBeInTheDocument();
  });

  it("copies GIF URL when copy button clicked", async () => {
    mockGiphyService.copyGifUrl.mockResolvedValueOnce(true);

    render(
      <GiphyCard
        gif={mockGif}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const copyButton = screen.getByLabelText("Copy GIF URL");
    fireEvent.click(copyButton);

    expect(mockGiphyService.copyGifUrl).toHaveBeenCalledWith(mockGif);

    await waitFor(() => {
      expect(screen.getByText("✓")).toBeInTheDocument();
    });

    // Fast forward to hide the checkmark
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.getByText("📋")).toBeInTheDocument();
    });
  });

  it("handles copy failure gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    mockGiphyService.copyGifUrl.mockRejectedValueOnce(new Error("Copy failed"));

    render(
      <GiphyCard
        gif={mockGif}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const copyButton = screen.getByLabelText("Copy GIF URL");
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to copy GIF URL:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("downloads GIF when download button clicked", async () => {
    mockGiphyService.downloadGif.mockResolvedValueOnce(undefined);

    render(
      <GiphyCard
        gif={mockGif}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const downloadButton = screen.getByLabelText("Download GIF");
    fireEvent.click(downloadButton);

    expect(mockGiphyService.downloadGif).toHaveBeenCalledWith(
      mockGif,
      "Funny Cat GIF-gif-123.gif",
    );

    await waitFor(() => {
      expect(screen.getByText("✓")).toBeInTheDocument();
    });

    // Fast forward to hide the checkmark
    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.getByText("⬇️")).toBeInTheDocument();
    });
  });

  it("handles download failure gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    mockGiphyService.downloadGif.mockRejectedValueOnce(
      new Error("Download failed"),
    );

    render(
      <GiphyCard
        gif={mockGif}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const downloadButton = screen.getByLabelText("Download GIF");
    fireEvent.click(downloadButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to download GIF:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("prevents event bubbling for action buttons", () => {
    render(
      <GiphyCard
        gif={mockGif}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const copyButton = screen.getByLabelText("Copy GIF URL");
    const downloadButton = screen.getByLabelText("Download GIF");

    fireEvent.click(copyButton);
    fireEvent.click(downloadButton);

    expect(mockOnImageClick).not.toHaveBeenCalled();
  });

  it("handles GIF without title", () => {
    const gifWithoutTitle = { ...mockGif, title: "" };

    render(
      <GiphyCard
        gif={gifWithoutTitle}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const img = screen.getByAltText("GIF");
    fireEvent.load(img);

    const container = document.querySelector(".giphy-grid-item");
    fireEvent.mouseEnter(container!);

    expect(
      document.querySelector(".giphy-info-overlay"),
    ).not.toBeInTheDocument();
  });

  it("handles GIF without username", () => {
    const gifWithoutUsername = { ...mockGif, username: undefined };

    render(
      <GiphyCard
        gif={gifWithoutUsername}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const img = screen.getByAltText("Funny Cat GIF");
    fireEvent.load(img);

    const container = document.querySelector(".giphy-grid-item");
    fireEvent.mouseEnter(container!);

    expect(screen.getByText("Funny Cat GIF")).toBeInTheDocument();
    expect(screen.queryByText(/by/)).not.toBeInTheDocument();
  });

  it("applies index style for animation", () => {
    render(
      <GiphyCard
        gif={mockGif}
        index={5}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const container = document.querySelector(".giphy-grid-item");
    expect(container).toHaveStyle({ "--index": 5 });
  });

  it("uses GIF id for download filename when title is empty", () => {
    const gifWithoutTitle = { ...mockGif, title: "" };

    render(
      <GiphyCard
        gif={gifWithoutTitle}
        index={0}
        isFavorited={false}
        onImageClick={mockOnImageClick}
        onFavoriteToggle={mockOnFavoriteToggle}
      />,
    );

    const downloadButton = screen.getByLabelText("Download GIF");
    fireEvent.click(downloadButton);

    expect(mockGiphyService.downloadGif).toHaveBeenCalledWith(
      gifWithoutTitle,
      "gif-gif-123.gif",
    );
  });
});
