import { renderHook, act } from "@testing-library/react";
import { useRaccoonPhysics } from "./useRaccoonPhysics";
import { PhysicsEngine } from "../lib/physics";

// Mock the physics module
jest.mock("../lib/physics");

const mockPhysicsEngine = PhysicsEngine as jest.MockedClass<
  typeof PhysicsEngine
>;

describe("useRaccoonPhysics", () => {
  let containerRef: React.RefObject<HTMLDivElement>;
  let mockContainer: HTMLDivElement;
  let mockPhysicsInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Create mock container
    mockContainer = document.createElement("div");
    containerRef = { current: mockContainer };

    // Mock getBoundingClientRect
    mockContainer.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    // Mock Physics Engine instance
    mockPhysicsInstance = {
      updateConfig: jest.fn(),
      step: jest.fn(() => ({ bounced: false })),
      isAtRest: jest.fn(() => true),
      applyDrag: jest.fn(),
      throwObject: jest.fn(),
    };

    mockPhysicsEngine.mockImplementation(() => mockPhysicsInstance);

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn((callback) => {
      return setTimeout(callback, 16);
    });
    global.cancelAnimationFrame = jest.fn((id) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("initializes with default position", () => {
    const { result } = renderHook(() => useRaccoonPhysics({ containerRef }));

    expect(result.current.state).toEqual({
      x: 100,
      y: 100,
      angle: 0,
      isDragging: false,
      isAnimating: false,
      expression: "idle",
    });
  });

  it("initializes with custom position", () => {
    const { result } = renderHook(() =>
      useRaccoonPhysics({
        containerRef,
        initialPosition: { x: 200, y: 300 },
      }),
    );

    expect(result.current.state.x).toBe(200);
    expect(result.current.state.y).toBe(300);
  });

  it("updates physics config when changed", () => {
    const physicsConfig = { gravity: 2, friction: 0.5 };
    const { rerender } = renderHook(
      ({ config }) =>
        useRaccoonPhysics({ containerRef, physicsConfig: config }),
      { initialProps: { config: physicsConfig } },
    );

    expect(mockPhysicsInstance.updateConfig).toHaveBeenCalledWith(
      physicsConfig,
    );

    const newConfig = { gravity: 3, friction: 0.7 };
    rerender({ config: newConfig });

    expect(mockPhysicsInstance.updateConfig).toHaveBeenCalledWith(newConfig);
  });

  describe("drag interactions", () => {
    it("handles drag start", () => {
      const { result } = renderHook(() => useRaccoonPhysics({ containerRef }));

      act(() => {
        result.current.handlers.onDragStart(150, 200);
      });

      expect(result.current.state.isDragging).toBe(true);
      expect(result.current.state.expression).toBe("surprised");
    });

    it("handles drag move", () => {
      const { result } = renderHook(() => useRaccoonPhysics({ containerRef }));

      act(() => {
        result.current.handlers.onDragStart(100, 100);
      });

      act(() => {
        result.current.handlers.onDragMove(200, 150);
      });

      expect(mockPhysicsInstance.applyDrag).toHaveBeenCalled();
      expect(result.current.state.x).toBe(200);
      expect(result.current.state.y).toBe(150);
      expect(result.current.state.angle).toBe(0);
    });

    it("handles drag end with throw", () => {
      const onThrow = jest.fn();
      const { result } = renderHook(() =>
        useRaccoonPhysics({ containerRef, onThrow }),
      );

      act(() => {
        result.current.handlers.onDragStart(100, 100);
      });

      // Simulate multiple drag moves to build velocity
      act(() => {
        jest.advanceTimersByTime(10);
        result.current.handlers.onDragMove(110, 110);
      });

      act(() => {
        jest.advanceTimersByTime(10);
        result.current.handlers.onDragMove(130, 130);
      });

      act(() => {
        result.current.handlers.onDragEnd();
      });

      expect(result.current.state.isDragging).toBe(false);
      expect(result.current.state.expression).toBe("happy");
      expect(onThrow).toHaveBeenCalled();
    });

    it("handles drag end without throw", () => {
      const onThrow = jest.fn();
      const { result } = renderHook(() =>
        useRaccoonPhysics({ containerRef, onThrow }),
      );

      act(() => {
        result.current.handlers.onDragStart(100, 100);
      });

      // Simulate minimal movement
      act(() => {
        jest.advanceTimersByTime(10);
        result.current.handlers.onDragMove(101, 101);
      });

      act(() => {
        result.current.handlers.onDragEnd();
      });

      expect(result.current.state.isDragging).toBe(false);
      expect(onThrow).not.toHaveBeenCalled();
    });

    it("ignores drag operations without container", () => {
      const { result } = renderHook(() =>
        useRaccoonPhysics({ containerRef: { current: null } }),
      );

      act(() => {
        result.current.handlers.onDragStart(100, 100);
      });

      expect(result.current.state.isDragging).toBe(false);
    });
  });

  describe("animations", () => {
    it("starts animation when not at rest", () => {
      mockPhysicsInstance.isAtRest.mockReturnValue(false);

      const { result } = renderHook(() => useRaccoonPhysics({ containerRef }));

      act(() => {
        result.current.handlers.toss();
      });

      expect(result.current.state.isAnimating).toBe(true);
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });

    it("stops animation when at rest", () => {
      mockPhysicsInstance.isAtRest
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      const { result } = renderHook(() => useRaccoonPhysics({ containerRef }));

      act(() => {
        result.current.handlers.toss();
      });

      act(() => {
        jest.runOnlyPendingTimers();
      });

      expect(result.current.state.isAnimating).toBe(false);
    });

    it("calls onBounce when bounce detected", () => {
      const onBounce = jest.fn();
      mockPhysicsInstance.step.mockReturnValue({ bounced: true });
      mockPhysicsInstance.isAtRest.mockReturnValue(false);

      const { result } = renderHook(() =>
        useRaccoonPhysics({ containerRef, onBounce }),
      );

      act(() => {
        result.current.handlers.toss();
      });

      act(() => {
        jest.runOnlyPendingTimers();
      });

      expect(onBounce).toHaveBeenCalled();
      expect(result.current.state.expression).toBe("dizzy");
    });

    it("skips animation when dragging", () => {
      mockPhysicsInstance.isAtRest.mockReturnValue(false);

      const { result } = renderHook(() => useRaccoonPhysics({ containerRef }));

      act(() => {
        result.current.handlers.onDragStart(100, 100);
      });

      act(() => {
        result.current.handlers.toss();
      });

      // Animation should not start while dragging
      expect(global.requestAnimationFrame).not.toHaveBeenCalled();
    });
  });

  describe("toss action", () => {
    it("tosses raccoon with random velocity", () => {
      const { result } = renderHook(() => useRaccoonPhysics({ containerRef }));

      act(() => {
        result.current.handlers.toss();
      });

      expect(mockPhysicsInstance.throwObject).toHaveBeenCalled();
      expect(result.current.state.expression).toBe("happy");
      expect(result.current.state.isAnimating).toBe(true);
    });
  });

  describe("pet action", () => {
    it("shows love expression temporarily", () => {
      const { result } = renderHook(() => useRaccoonPhysics({ containerRef }));

      act(() => {
        result.current.handlers.pet();
      });

      expect(result.current.state.expression).toBe("love");

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(result.current.state.expression).toBe("idle");
    });
  });

  describe("physics integration", () => {
    it("updates position from physics engine", () => {
      mockPhysicsInstance.isAtRest.mockReturnValue(false);

      const { result } = renderHook(() => useRaccoonPhysics({ containerRef }));

      // Mock physics engine updating the body position
      const mockPhysicsBody = {
        x: 250,
        y: 350,
        angle: 0.5,
        vx: 10,
        vy: 5,
        angularVelocity: 0.1,
      };

      mockPhysicsInstance.step.mockImplementation((body) => {
        body.x = mockPhysicsBody.x;
        body.y = mockPhysicsBody.y;
        body.angle = mockPhysicsBody.angle;
        return { bounced: false };
      });

      act(() => {
        result.current.handlers.toss();
      });

      act(() => {
        jest.runOnlyPendingTimers();
      });

      expect(result.current.state.x).toBe(250);
      expect(result.current.state.y).toBe(350);
      expect(result.current.state.angle).toBe(0.5);
    });

    it("respects custom raccoon size", () => {
      const raccoonSize = { width: 150, height: 150 };

      const { result } = renderHook(() =>
        useRaccoonPhysics({ containerRef, raccoonSize }),
      );

      act(() => {
        result.current.handlers.toss();
      });

      act(() => {
        jest.runOnlyPendingTimers();
      });

      expect(mockPhysicsInstance.step).toHaveBeenCalledWith(
        expect.any(Object),
        { width: 800, height: 600 },
        raccoonSize,
      );
    });
  });

  describe("cleanup", () => {
    it("cancels animation frame on unmount", () => {
      mockPhysicsInstance.isAtRest.mockReturnValue(false);

      const { result, unmount } = renderHook(() =>
        useRaccoonPhysics({ containerRef }),
      );

      act(() => {
        result.current.handlers.toss();
      });

      unmount();

      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });
  });
});
