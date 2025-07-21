import { render, screen } from "@testing-library/react";
import { ProgressIndicator } from "./ProgressIndicator";

describe("ProgressIndicator", () => {
  it("renders with default props", () => {
    render(<ProgressIndicator />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
  });

  it("renders circular variant by default", () => {
    const { container } = render(<ProgressIndicator />);

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute("role", "progressbar");
  });

  it("renders with custom progress value", () => {
    render(<ProgressIndicator progress={75} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "75");
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
  });

  it("displays label when provided", () => {
    render(<ProgressIndicator progress={50} label="Upload progress" />);

    expect(screen.getByText("Upload progress")).toBeInTheDocument();
  });

  it("shows percentage when showPercentage is true", () => {
    render(<ProgressIndicator progress={60} showPercentage />);

    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("renders linear variant", () => {
    render(<ProgressIndicator progress={40} variant="linear" />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();

    // Should not have SVG for linear variant
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders dots variant", () => {
    const { container } = render(<ProgressIndicator variant="dots" />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();

    // Should have 3 dots
    const dots = container.querySelectorAll('[style*="border-radius: 50%"]');
    expect(dots).toHaveLength(3);
  });

  it("handles indeterminate state", () => {
    render(<ProgressIndicator indeterminate />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).not.toHaveAttribute("aria-valuenow");
  });

  it("does not show percentage in indeterminate state", () => {
    render(<ProgressIndicator indeterminate showPercentage />);

    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("applies different sizes", () => {
    const sizes = ["small", "medium", "large"] as const;

    sizes.forEach((size) => {
      const { container } = render(<ProgressIndicator size={size} />);
      const svg = container.querySelector("svg");

      if (size === "small") {
        expect(svg).toHaveAttribute("width", "24px");
        expect(svg).toHaveAttribute("height", "24px");
      } else if (size === "medium") {
        expect(svg).toHaveAttribute("width", "40px");
        expect(svg).toHaveAttribute("height", "40px");
      } else if (size === "large") {
        expect(svg).toHaveAttribute("width", "60px");
        expect(svg).toHaveAttribute("height", "60px");
      }

      container.remove();
    });
  });

  it("linear variant shows progress bar fill", () => {
    const { container } = render(
      <ProgressIndicator progress={65} variant="linear" />,
    );

    const progressBar = container.querySelector('[role="progressbar"]');
    const progressFill = progressBar?.querySelector("div");

    expect(progressFill).toBeTruthy();
    expect(progressFill?.style.width).toBe("65%");
  });

  it("shows label and percentage together in linear variant", () => {
    render(
      <ProgressIndicator
        progress={80}
        variant="linear"
        label="Processing"
        showPercentage
      />,
    );

    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("handles zero progress", () => {
    render(<ProgressIndicator progress={0} showPercentage />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("handles 100% progress", () => {
    render(<ProgressIndicator progress={100} showPercentage />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "100");
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("rounds decimal progress values", () => {
    render(<ProgressIndicator progress={33.7} showPercentage />);

    expect(screen.getByText("34%")).toBeInTheDocument();
  });

  it("applies custom color", () => {
    const { container } = render(
      <ProgressIndicator progress={50} color="red" variant="linear" />,
    );

    const progressFill = container.querySelector(
      '[role="progressbar"] > div',
    ) as HTMLElement;
    expect(progressFill).toBeTruthy();
    expect(progressFill?.style.backgroundColor).toBe("red");
  });

  it("has proper accessibility label", () => {
    render(<ProgressIndicator progress={45} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-label", "Loading progress");
  });

  it("uses custom label for accessibility", () => {
    render(<ProgressIndicator progress={45} label="Uploading files" />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-label", "Uploading files");
  });
});
