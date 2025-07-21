import { renderHook, act } from "@testing-library/react";
import { useFocusManagement } from "./useFocusManagement";

describe("useFocusManagement", () => {
  let container: HTMLDivElement;
  let mockElement: HTMLElement;
  let mockInput: HTMLInputElement;
  let mockButton: HTMLButtonElement;
  let mockTextarea: HTMLTextAreaElement;
  let mockLink: HTMLAnchorElement;
  let mockDisabledButton: HTMLButtonElement;

  beforeEach(() => {
    jest.useFakeTimers();

    // Create container
    container = document.createElement("div");
    document.body.appendChild(container);

    // Create focusable elements
    mockInput = document.createElement("input");
    mockButton = document.createElement("button");
    mockTextarea = document.createElement("textarea");
    mockLink = document.createElement("a");
    mockLink.href = "#";
    mockDisabledButton = document.createElement("button");
    mockDisabledButton.disabled = true;

    // Add elements to container
    container.appendChild(mockInput);
    container.appendChild(mockButton);
    container.appendChild(mockTextarea);
    container.appendChild(mockLink);
    container.appendChild(mockDisabledButton);

    // Mock focus method
    mockElement = document.createElement("div");
    mockElement.focus = jest.fn();
    mockInput.focus = jest.fn();
    mockButton.focus = jest.fn();
    mockTextarea.focus = jest.fn();
    mockLink.focus = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  it("sets container ref", () => {
    const { result } = renderHook(() => useFocusManagement(true));

    act(() => {
      result.current.containerRef.current = container;
    });

    expect(result.current.containerRef.current).toBe(container);
  });

  describe("getFocusableElements", () => {
    it("returns focusable elements when container is set", () => {
      const { result } = renderHook(() => useFocusManagement(true));

      act(() => {
        result.current.containerRef.current = container;
      });

      const elements = result.current.getFocusableElements();

      expect(elements).toHaveLength(4); // input, button, textarea, link (not disabled button)
      expect(elements).toContain(mockInput);
      expect(elements).toContain(mockButton);
      expect(elements).toContain(mockTextarea);
      expect(elements).toContain(mockLink);
      expect(elements).not.toContain(mockDisabledButton);
    });

    it("returns empty array when container is not set", () => {
      const { result } = renderHook(() => useFocusManagement(true));

      const elements = result.current.getFocusableElements();

      expect(elements).toEqual([]);
    });

    it('filters out elements with tabindex="-1"', () => {
      const hiddenButton = document.createElement("button");
      hiddenButton.setAttribute("tabindex", "-1");
      container.appendChild(hiddenButton);

      const { result } = renderHook(() => useFocusManagement(true));

      act(() => {
        result.current.containerRef.current = container;
      });

      const elements = result.current.getFocusableElements();

      expect(elements).not.toContain(hiddenButton);
    });
  });

  describe("focusFirstElement", () => {
    it("focuses first focusable element", () => {
      const { result } = renderHook(() => useFocusManagement(true));

      act(() => {
        result.current.containerRef.current = container;
      });

      act(() => {
        result.current.focusFirstElement();
      });

      expect(mockInput.focus).toHaveBeenCalled();
    });

    it("focuses element matching initial selector", () => {
      const { result } = renderHook(() =>
        useFocusManagement(true, { initialFocusSelector: "button" }),
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      act(() => {
        result.current.focusFirstElement();
      });

      expect(mockButton.focus).toHaveBeenCalled();
    });

    it("returns null when no focusable elements", () => {
      const emptyContainer = document.createElement("div");
      const { result } = renderHook(() => useFocusManagement(true));

      act(() => {
        result.current.containerRef.current = emptyContainer;
      });

      const focused = result.current.focusFirstElement();

      expect(focused).toBeNull();
    });
  });

  describe("focusElement", () => {
    it("focuses element by selector", () => {
      const { result } = renderHook(() => useFocusManagement(true));

      act(() => {
        result.current.containerRef.current = container;
      });

      act(() => {
        result.current.focusElement("button");
      });

      expect(mockButton.focus).toHaveBeenCalled();
    });

    it("returns null when element not found", () => {
      const { result } = renderHook(() => useFocusManagement(true));

      act(() => {
        result.current.containerRef.current = container;
      });

      const focused = result.current.focusElement(".nonexistent");

      expect(focused).toBeNull();
    });

    it("returns null when container not set", () => {
      const { result } = renderHook(() => useFocusManagement(true));

      const focused = result.current.focusElement("button");

      expect(focused).toBeNull();
    });
  });

  describe("contains", () => {
    it("returns true for contained element", () => {
      const { result } = renderHook(() => useFocusManagement(true));

      act(() => {
        result.current.containerRef.current = container;
      });

      expect(result.current.contains(mockInput)).toBe(true);
    });

    it("returns false for non-contained element", () => {
      const outsideElement = document.createElement("div");
      const { result } = renderHook(() => useFocusManagement(true));

      act(() => {
        result.current.containerRef.current = container;
      });

      expect(result.current.contains(outsideElement)).toBe(false);
    });

    it("returns false when container not set", () => {
      const { result } = renderHook(() => useFocusManagement(true));

      expect(result.current.contains(mockInput)).toBe(false);
    });
  });

  describe("autoFocus", () => {
    it("auto-focuses first element when active", () => {
      const { result } = renderHook(() =>
        useFocusManagement(true, { autoFocus: true }),
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      act(() => {
        jest.advanceTimersByTime(10);
      });

      expect(mockInput.focus).toHaveBeenCalled();
    });

    it("does not auto-focus when autoFocus is false", () => {
      const { result } = renderHook(() =>
        useFocusManagement(true, { autoFocus: false }),
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      act(() => {
        jest.advanceTimersByTime(10);
      });

      expect(mockInput.focus).not.toHaveBeenCalled();
    });

    it("does not auto-focus when not active", () => {
      const { result } = renderHook(() =>
        useFocusManagement(false, { autoFocus: true }),
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      act(() => {
        jest.advanceTimersByTime(10);
      });

      expect(mockInput.focus).not.toHaveBeenCalled();
    });
  });

  describe("restoreFocus", () => {
    it("stores and restores previous active element", () => {
      const previousElement = document.createElement("button");
      previousElement.focus = jest.fn();
      document.body.appendChild(previousElement);

      // Set initial focus
      Object.defineProperty(document, "activeElement", {
        value: previousElement,
        configurable: true,
      });

      const { result, rerender } = renderHook(
        ({ isActive }) => useFocusManagement(isActive, { restoreFocus: true }),
        { initialProps: { isActive: true } },
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      // Deactivate
      rerender({ isActive: false });

      expect(previousElement.focus).toHaveBeenCalled();

      document.body.removeChild(previousElement);
    });

    it("does not restore focus when restoreFocus is false", () => {
      const previousElement = document.createElement("button");
      previousElement.focus = jest.fn();
      document.body.appendChild(previousElement);

      Object.defineProperty(document, "activeElement", {
        value: previousElement,
        configurable: true,
      });

      const { result, rerender } = renderHook(
        ({ isActive }) => useFocusManagement(isActive, { restoreFocus: false }),
        { initialProps: { isActive: true } },
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      // Deactivate
      rerender({ isActive: false });

      expect(previousElement.focus).not.toHaveBeenCalled();

      document.body.removeChild(previousElement);
    });
  });

  describe("trapFocus", () => {
    it("traps focus within container on Tab", () => {
      const { result } = renderHook(() =>
        useFocusManagement(true, { trapFocus: true }),
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      // Set focus on last element
      Object.defineProperty(document, "activeElement", {
        value: mockLink,
        configurable: true,
      });

      // Simulate Tab key
      const event = new KeyboardEvent("keydown", { key: "Tab" });
      event.preventDefault = jest.fn();

      act(() => {
        document.dispatchEvent(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockInput.focus).toHaveBeenCalled();
    });

    it("traps focus within container on Shift+Tab", () => {
      const { result } = renderHook(() =>
        useFocusManagement(true, { trapFocus: true }),
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      // Set focus on first element
      Object.defineProperty(document, "activeElement", {
        value: mockInput,
        configurable: true,
      });

      // Simulate Shift+Tab key
      const event = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
      });
      event.preventDefault = jest.fn();

      act(() => {
        document.dispatchEvent(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockLink.focus).toHaveBeenCalled();
    });

    it("does not trap focus when trapFocus is false", () => {
      const { result } = renderHook(() =>
        useFocusManagement(true, { trapFocus: false }),
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      // Set focus on last element
      Object.defineProperty(document, "activeElement", {
        value: mockLink,
        configurable: true,
      });

      // Simulate Tab key
      const event = new KeyboardEvent("keydown", { key: "Tab" });
      event.preventDefault = jest.fn();

      act(() => {
        document.dispatchEvent(event);
      });

      expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it("handles Escape key when trapFocus is true", () => {
      const previousElement = document.createElement("button");
      previousElement.focus = jest.fn();
      document.body.appendChild(previousElement);

      Object.defineProperty(document, "activeElement", {
        value: previousElement,
        configurable: true,
      });

      const { result } = renderHook(() =>
        useFocusManagement(true, { trapFocus: true, restoreFocus: true }),
      );

      act(() => {
        result.current.containerRef.current = container;
      });

      // Simulate Escape key
      const event = new KeyboardEvent("keydown", { key: "Escape" });
      event.preventDefault = jest.fn();

      act(() => {
        document.dispatchEvent(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(previousElement.focus).toHaveBeenCalled();

      document.body.removeChild(previousElement);
    });
  });

  describe("cleanup", () => {
    it("removes event listeners when inactive", () => {
      const addEventListenerSpy = jest.spyOn(document, "addEventListener");
      const removeEventListenerSpy = jest.spyOn(
        document,
        "removeEventListener",
      );

      const { rerender } = renderHook(
        ({ isActive }) => useFocusManagement(isActive, { trapFocus: true }),
        { initialProps: { isActive: true } },
      );

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );

      // Deactivate
      rerender({ isActive: false });

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "keydown",
        expect.any(Function),
      );

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});
