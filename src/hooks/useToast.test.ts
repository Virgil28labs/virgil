import { renderHook, act } from "@testing-library/react";
import { useToast } from "./useToast";

describe("useToast", () => {
  it("initializes with empty toasts array", () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toEqual([]);
  });

  it("adds a toast with string message", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast("Test message");
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      type: "info",
      message: "Test message",
    });
    expect(result.current.toasts[0].id).toBeDefined();
  });

  it("adds a toast with object configuration", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast({
        type: "success",
        message: "Success message",
        duration: 3000,
      });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      type: "success",
      message: "Success message",
      duration: 3000,
    });
  });

  it("generates unique IDs for toasts", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast("First toast");
      result.current.addToast("Second toast");
      result.current.addToast("Third toast");
    });

    const ids = result.current.toasts.map((toast) => toast.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });

  it("removes a toast by ID", () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;
    act(() => {
      toastId = result.current.addToast("Test toast");
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.removeToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("removes only the specified toast", () => {
    const { result } = renderHook(() => useToast());

    let toast1Id: string;
    let toast2Id: string;
    let toast3Id: string;

    act(() => {
      toast1Id = result.current.addToast("Toast 1");
      toast2Id = result.current.addToast("Toast 2");
      toast3Id = result.current.addToast("Toast 3");
    });

    expect(result.current.toasts).toHaveLength(3);

    act(() => {
      result.current.removeToast(toast2Id);
    });

    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts.find((t) => t.id === toast1Id)).toBeDefined();
    expect(
      result.current.toasts.find((t) => t.id === toast2Id),
    ).toBeUndefined();
    expect(result.current.toasts.find((t) => t.id === toast3Id)).toBeDefined();
  });

  it("clears all toasts", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast("Toast 1");
      result.current.addToast("Toast 2");
      result.current.addToast("Toast 3");
    });

    expect(result.current.toasts).toHaveLength(3);

    act(() => {
      result.current.clearToasts();
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("success convenience method works correctly", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success("Success!");
    });

    expect(result.current.toasts[0]).toMatchObject({
      type: "success",
      message: "Success!",
    });
  });

  it("error convenience method works correctly with longer duration", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.error("Error occurred");
    });

    expect(result.current.toasts[0]).toMatchObject({
      type: "error",
      message: "Error occurred",
      duration: 7000, // Errors have longer duration by default
    });
  });

  it("warning convenience method works correctly", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.warning("Warning message");
    });

    expect(result.current.toasts[0]).toMatchObject({
      type: "warning",
      message: "Warning message",
    });
  });

  it("info convenience method works correctly", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.info("Info message");
    });

    expect(result.current.toasts[0]).toMatchObject({
      type: "info",
      message: "Info message",
    });
  });

  it("convenience methods accept additional options", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success("Custom success", {
        duration: 10000,
        persistent: true,
        action: {
          label: "Undo",
          onClick: jest.fn(),
        },
      });
    });

    expect(result.current.toasts[0]).toMatchObject({
      type: "success",
      message: "Custom success",
      duration: 10000,
      persistent: true,
      action: {
        label: "Undo",
        onClick: expect.any(Function),
      },
    });
  });

  it("returns toast ID from all methods", () => {
    const { result } = renderHook(() => useToast());

    let id1: string;
    let id2: string;
    let id3: string;
    let id4: string;
    let id5: string;

    act(() => {
      id1 = result.current.addToast("Test");
      id2 = result.current.success("Success");
      id3 = result.current.error("Error");
      id4 = result.current.warning("Warning");
      id5 = result.current.info("Info");
    });

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id3).toBeDefined();
    expect(id4).toBeDefined();
    expect(id5).toBeDefined();

    // All IDs should be unique
    const ids = [id1, id2, id3, id4, id5];
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);
  });

  it("handles removing non-existent toast ID gracefully", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast("Test toast");
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      result.current.removeToast("non-existent-id");
    });

    // Should not remove anything
    expect(result.current.toasts).toHaveLength(1);
  });

  it("maintains toast order when adding multiple toasts", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast("First");
      result.current.addToast("Second");
      result.current.addToast("Third");
    });

    expect(result.current.toasts[0].message).toBe("First");
    expect(result.current.toasts[1].message).toBe("Second");
    expect(result.current.toasts[2].message).toBe("Third");
  });
});
