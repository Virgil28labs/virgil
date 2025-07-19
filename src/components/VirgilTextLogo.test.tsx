import { render, screen } from "@testing-library/react";
import { VirgilTextLogo } from "./VirgilTextLogo";

describe("VirgilTextLogo", () => {
  it("renders the logo text", () => {
    render(<VirgilTextLogo />);

    expect(screen.getByText("V")).toBeInTheDocument();
    expect(screen.getByText("I")).toBeInTheDocument();
    expect(screen.getByText("R")).toBeInTheDocument();
    expect(screen.getByText("G")).toBeInTheDocument();
    expect(screen.getAllByText("I")[0]).toBeInTheDocument(); // First I
    expect(screen.getByText("L")).toBeInTheDocument();
  });

  it("renders with default size", () => {
    const { container } = render(<VirgilTextLogo />);

    const logoContainer = container.firstChild as HTMLElement;
    expect(logoContainer).toHaveClass("virgil-text-logo");

    // Check default font size
    const letters = container.querySelectorAll(".virgil-letter");
    expect(letters[0]).toHaveStyle({ fontSize: "3rem" });
  });

  it("renders with custom size", () => {
    const { container } = render(<VirgilTextLogo size="sm" />);

    const logoContainer = container.firstChild as HTMLElement;
    expect(logoContainer).toHaveClass("virgil-text-logo-sm");

    // Check small font size
    const letters = container.querySelectorAll(".virgil-letter");
    expect(letters[0]).toHaveStyle({ fontSize: "1.5rem" });
  });

  it("renders with large size", () => {
    const { container } = render(<VirgilTextLogo size="lg" />);

    const logoContainer = container.firstChild as HTMLElement;
    expect(logoContainer).toHaveClass("virgil-text-logo-lg");

    // Check large font size
    const letters = container.querySelectorAll(".virgil-letter");
    expect(letters[0]).toHaveStyle({ fontSize: "4rem" });
  });

  it("applies color classes to each letter", () => {
    const { container } = render(<VirgilTextLogo />);

    const letters = container.querySelectorAll(".virgil-letter");

    expect(letters[0]).toHaveClass("virgil-violet");
    expect(letters[1]).toHaveClass("virgil-indigo");
    expect(letters[2]).toHaveClass("virgil-red");
    expect(letters[3]).toHaveClass("virgil-green");
    expect(letters[4]).toHaveClass("virgil-indigo");
    expect(letters[5]).toHaveClass("virgil-lavender");
  });

  it("applies custom className", () => {
    render(<VirgilTextLogo className="custom-logo" />);

    const logo = screen.getByText("V").closest(".virgil-text-logo");
    expect(logo).toHaveClass("custom-logo");
  });

  it("maintains proper letter spacing", () => {
    const { container } = render(<VirgilTextLogo />);

    const letters = container.querySelectorAll(".virgil-letter");
    letters.forEach((letter) => {
      expect(letter).toHaveStyle({
        letterSpacing: "-0.05em",
        display: "inline-block",
      });
    });
  });

  it("has proper font styling", () => {
    const { container } = render(<VirgilTextLogo />);

    const logoContainer = container.firstChild as HTMLElement;
    expect(logoContainer).toHaveStyle({
      fontFamily: expect.stringContaining("Inter"),
      fontWeight: "800",
    });
  });

  it("is accessible with proper ARIA attributes", () => {
    render(<VirgilTextLogo />);

    const logo = screen.getByText("V").closest(".virgil-text-logo");
    expect(logo).toHaveAttribute("role", "heading");
    expect(logo).toHaveAttribute("aria-level", "1");
    expect(logo).toHaveAttribute("aria-label", "Virgil");
  });

  it("renders inline by default", () => {
    const { container } = render(<VirgilTextLogo />);

    const logoContainer = container.firstChild as HTMLElement;
    expect(logoContainer).toHaveStyle({
      display: "inline-flex",
    });
  });

  it("centers letters vertically", () => {
    const { container } = render(<VirgilTextLogo />);

    const logoContainer = container.firstChild as HTMLElement;
    expect(logoContainer).toHaveStyle({
      alignItems: "center",
    });
  });

  it("has gradient text effect", () => {
    const { container } = render(<VirgilTextLogo />);

    const letters = container.querySelectorAll(".virgil-letter");
    letters.forEach((letter) => {
      expect(letter).toHaveStyle({
        backgroundClip: "text",
      });
    });
  });

  it("supports responsive sizing", () => {
    const { rerender, container } = render(<VirgilTextLogo />);

    // Default size
    let logoContainer = container.firstChild as HTMLElement;
    expect(logoContainer).toHaveClass("virgil-text-logo");

    // Change to small
    rerender(<VirgilTextLogo size="sm" />);
    logoContainer = container.firstChild as HTMLElement;
    expect(logoContainer).toHaveClass("virgil-text-logo-sm");

    // Change to large
    rerender(<VirgilTextLogo size="lg" />);
    logoContainer = container.firstChild as HTMLElement;
    expect(logoContainer).toHaveClass("virgil-text-logo-lg");
  });

  it("maintains consistent styling across sizes", () => {
    const sizes: Array<"sm" | "md" | "lg" | undefined> = [
      "sm",
      "md",
      "lg",
      undefined,
    ];

    sizes.forEach((size) => {
      const { container } = render(<VirgilTextLogo size={size} />);
      const logoContainer = container.firstChild as HTMLElement;

      // All sizes should have the same base styles
      expect(logoContainer).toHaveStyle({
        fontFamily: expect.stringContaining("Inter"),
        fontWeight: "800",
        display: "inline-flex",
        alignItems: "center",
      });
    });
  });
});
