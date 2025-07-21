import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DogCard } from "./DogCard";
import type { DogImage } from "./hooks/useDogApi";
import * as imageUtils from "./utils/imageUtils";

// Mock the image utilities
jest.mock("./utils/imageUtils", () => ({
  stopEvent: jest.fn(),
  downloadImage: jest.fn(),
  copyImageToClipboard: jest.fn(),
}));

describe("DogCard", () => {
  const mockDog: DogImage = {
    url: "https://example.com/dog.jpg",
    breed: "akita",
    id: "dog-123",
  };

  const defaultProps = {
    dog: mockDog,
    index: 0,
    isFavorited: false,
    onImageClick: jest.fn(),
    onFavoriteToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("rendering", () => {
    it("should render with initial loading state", () => {
      render(<DogCard {...defaultProps} />);

      expect(screen.getByRole("img")).toHaveAttribute("alt", "akita dog");
      expect(screen.getByRole("img")).toHaveAttribute("src", mockDog.url);
      expect(screen.getByRole("img")).toHaveStyle({ opacity: "0" });

      // Should show skeleton loader
      const skeleton = document.querySelector(".doggo-image-skeleton");
      expect(skeleton).toBeInTheDocument();
    });

    it("should render with custom index style", () => {
      render(<DogCard {...defaultProps} index={5} />);

      const gridItem = document.querySelector(".doggo-grid-item");
      expect(gridItem).toHaveStyle({ "--index": "5" });
    });

    it("should show favorite button with correct state", () => {
      const { rerender } = render(<DogCard {...defaultProps} />);

      let favoriteButton = screen.getByLabelText("Add to favorites");
      expect(favoriteButton).toHaveTextContent("🤍");
      expect(favoriteButton).not.toHaveClass("favorited");

      rerender(<DogCard {...defaultProps} isFavorited={true} />);

      favoriteButton = screen.getByLabelText("Remove from favorites");
      expect(favoriteButton).toHaveTextContent("❤️");
      expect(favoriteButton).toHaveClass("favorited");
    });

    it("should show action buttons", () => {
      render(<DogCard {...defaultProps} />);

      expect(screen.getByLabelText("Download image")).toBeInTheDocument();
      expect(screen.getByLabelText("Copy image")).toBeInTheDocument();
    });
  });

  describe("image loading", () => {
    it("should handle successful image load", () => {
      render(<DogCard {...defaultProps} />);

      const img = screen.getByRole("img");

      // Simulate image load
      fireEvent.load(img);

      expect(img).toHaveStyle({ opacity: "1" });
      expect(
        document.querySelector(".doggo-image-skeleton"),
      ).not.toBeInTheDocument();
      expect(document.querySelector(".doggo-grid-item")).toHaveAttribute(
        "data-loaded",
        "true",
      );
    });

    it("should handle image load error", () => {
      render(<DogCard {...defaultProps} />);

      const img = screen.getByRole("img");

      // Simulate image error
      fireEvent.error(img);

      expect(screen.getByText("🐕‍🦺")).toBeInTheDocument();
      expect(screen.queryByRole("img")).not.toBeInTheDocument();
    });
  });

  describe("interactions", () => {
    it("should handle image click", () => {
      render(<DogCard {...defaultProps} />);

      const gridItem = document.querySelector(".doggo-grid-item")!;
      fireEvent.click(gridItem);

      expect(defaultProps.onImageClick).toHaveBeenCalledTimes(1);
    });

    it("should handle favorite toggle", () => {
      const mockEvent = { stopPropagation: jest.fn() };
      render(<DogCard {...defaultProps} />);

      const favoriteButton = screen.getByLabelText("Add to favorites");
      fireEvent.click(favoriteButton, mockEvent);

      expect(defaultProps.onFavoriteToggle).toHaveBeenCalledTimes(1);
      expect(defaultProps.onFavoriteToggle).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "click",
        }),
      );
    });

    it("should handle download click", async () => {
      const mockStopEvent = imageUtils.stopEvent as jest.Mock;
      const mockDownloadImage = imageUtils.downloadImage as jest.Mock;
      mockDownloadImage.mockResolvedValue(undefined);

      render(<DogCard {...defaultProps} />);

      const downloadButton = screen.getByLabelText("Download image");
      fireEvent.click(downloadButton);

      expect(mockStopEvent).toHaveBeenCalledTimes(1);
      expect(mockDownloadImage).toHaveBeenCalledWith(
        mockDog.url,
        mockDog.breed,
      );

      // Should show success state
      await waitFor(() => {
        expect(downloadButton).toHaveTextContent("✓");
      });

      // Should revert after timeout
      await waitFor(
        () => {
          expect(downloadButton).toHaveTextContent("⬇️");
        },
        { timeout: 3000 },
      );
    });

    it("should handle download error", async () => {
      const mockDownloadImage = imageUtils.downloadImage as jest.Mock;
      mockDownloadImage.mockRejectedValue(new Error("Download failed"));

      render(<DogCard {...defaultProps} />);

      const downloadButton = screen.getByLabelText("Download image");
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          "Failed to download image:",
          expect.any(Error),
        );
      });

      // Should not show success state
      expect(downloadButton).toHaveTextContent("⬇️");
    });

    it("should handle copy click", async () => {
      const mockStopEvent = imageUtils.stopEvent as jest.Mock;
      const mockCopyImage = imageUtils.copyImageToClipboard as jest.Mock;
      mockCopyImage.mockResolvedValue(true);

      render(<DogCard {...defaultProps} />);

      const copyButton = screen.getByLabelText("Copy image");
      fireEvent.click(copyButton);

      expect(mockStopEvent).toHaveBeenCalledTimes(1);
      expect(mockCopyImage).toHaveBeenCalledWith(mockDog.url);

      // Should show success state
      await waitFor(() => {
        expect(copyButton).toHaveTextContent("✓");
      });

      // Should revert after timeout
      await waitFor(
        () => {
          expect(copyButton).toHaveTextContent("📋");
        },
        { timeout: 3000 },
      );
    });

    it("should handle copy error", async () => {
      const mockCopyImage = imageUtils.copyImageToClipboard as jest.Mock;
      mockCopyImage.mockRejectedValue(new Error("Copy failed"));

      render(<DogCard {...defaultProps} />);

      const copyButton = screen.getByLabelText("Copy image");
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          "Failed to copy image:",
          expect.any(Error),
        );
      });

      // Should not show success state
      expect(copyButton).toHaveTextContent("📋");
    });
  });

  describe("memoization", () => {
    it("should not re-render when props are the same", () => {
      const { rerender } = render(<DogCard {...defaultProps} />);

      const img = screen.getByRole("img");
      const originalImg = img;

      // Re-render with same props
      rerender(<DogCard {...defaultProps} />);

      // Should be the same element instance
      expect(screen.getByRole("img")).toBe(originalImg);
    });

    it("should re-render when dog prop changes", () => {
      const { rerender } = render(<DogCard {...defaultProps} />);

      const newDog: DogImage = {
        ...mockDog,
        url: "https://example.com/other-dog.jpg",
      };

      rerender(<DogCard {...defaultProps} dog={newDog} />);

      expect(screen.getByRole("img")).toHaveAttribute("src", newDog.url);
    });

    it("should re-render when isFavorited changes", () => {
      const { rerender } = render(<DogCard {...defaultProps} />);

      expect(screen.getByLabelText("Add to favorites")).toBeInTheDocument();

      rerender(<DogCard {...defaultProps} isFavorited={true} />);

      expect(
        screen.getByLabelText("Remove from favorites"),
      ).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper ARIA labels", () => {
      render(<DogCard {...defaultProps} />);

      expect(screen.getByRole("img")).toHaveAttribute("alt", "akita dog");
      expect(screen.getByLabelText("Add to favorites")).toBeInTheDocument();
      expect(screen.getByLabelText("Download image")).toBeInTheDocument();
      expect(screen.getByLabelText("Copy image")).toBeInTheDocument();
    });

    it("should have proper title attributes", () => {
      render(<DogCard {...defaultProps} />);

      expect(screen.getByLabelText("Download image")).toHaveAttribute(
        "title",
        "Download",
      );
      expect(screen.getByLabelText("Copy image")).toHaveAttribute(
        "title",
        "Copy image",
      );
    });

    it("should use lazy loading for images", () => {
      render(<DogCard {...defaultProps} />);

      expect(screen.getByRole("img")).toHaveAttribute("loading", "lazy");
    });
  });
});
