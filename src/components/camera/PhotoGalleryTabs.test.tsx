import { render, screen, fireEvent } from "@testing-library/react";
import { PhotoGalleryTabs } from "./PhotoGalleryTabs";

describe("PhotoGalleryTabs", () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all tabs", () => {
    render(
      <PhotoGalleryTabs
        activeTab="gallery"
        onTabChange={mockOnTabChange}
        photoCount={10}
        favoriteCount={3}
      />,
    );

    expect(screen.getByLabelText("Switch to Camera tab")).toBeInTheDocument();
    expect(screen.getByLabelText("Switch to Gallery tab")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Switch to Favorites tab"),
    ).toBeInTheDocument();
  });

  it("displays tab labels and icons", () => {
    render(
      <PhotoGalleryTabs
        activeTab="gallery"
        onTabChange={mockOnTabChange}
        photoCount={10}
        favoriteCount={3}
      />,
    );

    expect(screen.getByText("Camera")).toBeInTheDocument();
    expect(screen.getByText("Gallery")).toBeInTheDocument();
    expect(screen.getByText("Favorites")).toBeInTheDocument();

    expect(screen.getByText("📸")).toBeInTheDocument();
    expect(screen.getByText("🖼️")).toBeInTheDocument();
    expect(screen.getByText("❤️")).toBeInTheDocument();
  });

  it("shows photo counts for gallery and favorites", () => {
    render(
      <PhotoGalleryTabs
        activeTab="gallery"
        onTabChange={mockOnTabChange}
        photoCount={10}
        favoriteCount={3}
      />,
    );

    // Gallery count
    expect(screen.getByText("10")).toBeInTheDocument();

    // Favorites count
    expect(screen.getByText("3")).toBeInTheDocument();

    // Camera should not have a count
    const cameraTab = screen.getByLabelText("Switch to Camera tab");
    expect(cameraTab.querySelector(".tab-count")).not.toBeInTheDocument();
  });

  it("highlights active tab", () => {
    const { rerender } = render(
      <PhotoGalleryTabs
        activeTab="camera"
        onTabChange={mockOnTabChange}
        photoCount={10}
        favoriteCount={3}
      />,
    );

    expect(screen.getByLabelText("Switch to Camera tab")).toHaveClass("active");
    expect(screen.getByLabelText("Switch to Gallery tab")).not.toHaveClass(
      "active",
    );
    expect(screen.getByLabelText("Switch to Favorites tab")).not.toHaveClass(
      "active",
    );

    // Change active tab
    rerender(
      <PhotoGalleryTabs
        activeTab="gallery"
        onTabChange={mockOnTabChange}
        photoCount={10}
        favoriteCount={3}
      />,
    );

    expect(screen.getByLabelText("Switch to Camera tab")).not.toHaveClass(
      "active",
    );
    expect(screen.getByLabelText("Switch to Gallery tab")).toHaveClass(
      "active",
    );
    expect(screen.getByLabelText("Switch to Favorites tab")).not.toHaveClass(
      "active",
    );
  });

  it("calls onTabChange when tab is clicked", () => {
    render(
      <PhotoGalleryTabs
        activeTab="gallery"
        onTabChange={mockOnTabChange}
        photoCount={10}
        favoriteCount={3}
      />,
    );

    fireEvent.click(screen.getByLabelText("Switch to Camera tab"));
    expect(mockOnTabChange).toHaveBeenCalledWith("camera");

    fireEvent.click(screen.getByLabelText("Switch to Gallery tab"));
    expect(mockOnTabChange).toHaveBeenCalledWith("gallery");

    fireEvent.click(screen.getByLabelText("Switch to Favorites tab"));
    expect(mockOnTabChange).toHaveBeenCalledWith("favorites");
  });

  it("handles zero counts", () => {
    render(
      <PhotoGalleryTabs
        activeTab="gallery"
        onTabChange={mockOnTabChange}
        photoCount={0}
        favoriteCount={0}
      />,
    );

    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it("handles large counts", () => {
    render(
      <PhotoGalleryTabs
        activeTab="gallery"
        onTabChange={mockOnTabChange}
        photoCount={999}
        favoriteCount={100}
      />,
    );

    expect(screen.getByText("999")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("updates counts when props change", () => {
    const { rerender } = render(
      <PhotoGalleryTabs
        activeTab="gallery"
        onTabChange={mockOnTabChange}
        photoCount={10}
        favoriteCount={3}
      />,
    );

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    rerender(
      <PhotoGalleryTabs
        activeTab="gallery"
        onTabChange={mockOnTabChange}
        photoCount={15}
        favoriteCount={5}
      />,
    );

    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("has correct tab structure", () => {
    render(
      <PhotoGalleryTabs
        activeTab="gallery"
        onTabChange={mockOnTabChange}
        photoCount={10}
        favoriteCount={3}
      />,
    );

    const tabsContainer = document.querySelector(".photo-gallery-tabs");
    expect(tabsContainer).toBeInTheDocument();

    const tabs = document.querySelectorAll(".photo-gallery-tab");
    expect(tabs).toHaveLength(3);

    tabs.forEach((tab) => {
      expect(tab.querySelector(".tab-icon")).toBeInTheDocument();
      expect(tab.querySelector(".tab-label")).toBeInTheDocument();
    });
  });

  it("maintains tab order", () => {
    render(
      <PhotoGalleryTabs
        activeTab="gallery"
        onTabChange={mockOnTabChange}
        photoCount={10}
        favoriteCount={3}
      />,
    );

    const tabs = screen.getAllByRole("button");
    expect(tabs[0]).toHaveAttribute("aria-label", "Switch to Camera tab");
    expect(tabs[1]).toHaveAttribute("aria-label", "Switch to Gallery tab");
    expect(tabs[2]).toHaveAttribute("aria-label", "Switch to Favorites tab");
  });
});
