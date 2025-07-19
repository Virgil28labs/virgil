import { useState, useEffect } from "react";

export interface BreakpointConfig {
  mobile: number;
  tablet: number;
  desktop: number;
  wide: number;
}

const defaultBreakpoints: BreakpointConfig = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

export function useResponsive(
  breakpoints: BreakpointConfig = defaultBreakpoints,
) {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    "portrait",
  );

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setWindowSize({ width, height });
      setOrientation(height > width ? "portrait" : "landscape");
    };

    // Initial call
    handleResize();

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  const isMobile = windowSize.width <= breakpoints.mobile;
  const isTablet =
    windowSize.width > breakpoints.mobile &&
    windowSize.width <= breakpoints.tablet;
  const isDesktop =
    windowSize.width > breakpoints.tablet &&
    windowSize.width <= breakpoints.desktop;
  const isWide = windowSize.width > breakpoints.desktop;

  const isMobileOrTablet = windowSize.width <= breakpoints.tablet;
  const isDesktopOrWide = windowSize.width > breakpoints.tablet;

  // Touch device detection
  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  // Device type detection
  const deviceType = isMobile
    ? "mobile"
    : isTablet
      ? "tablet"
      : isDesktop
        ? "desktop"
        : "wide";

  return {
    windowSize,
    orientation,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    isMobileOrTablet,
    isDesktopOrWide,
    isTouchDevice,
    deviceType,
    breakpoints,
  };
}

// Media query hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    setMatches(mediaQuery.matches);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

// Viewport hook for mobile optimizations
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
    visualViewportHeight:
      typeof window !== "undefined" && window.visualViewport
        ? window.visualViewport.height
        : typeof window !== "undefined"
          ? window.innerHeight
          : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        visualViewportHeight:
          window.visualViewport?.height || window.innerHeight,
      });
    };

    const handleVisualViewportChange = () => {
      setViewport((prev) => ({
        ...prev,
        visualViewportHeight:
          window.visualViewport?.height || window.innerHeight,
      }));
    };

    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener(
      "resize",
      handleVisualViewportChange,
    );

    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener(
        "resize",
        handleVisualViewportChange,
      );
    };
  }, []);

  // Detect if mobile keyboard is open (visual viewport is significantly smaller than window)
  const isKeyboardOpen = viewport.height - viewport.visualViewportHeight > 150;

  return {
    ...viewport,
    isKeyboardOpen,
  };
}
