import React, { useState, useRef, useCallback, useEffect } from "react";
import { PhysicsEngine, PhysicsBody, PhysicsConfig } from "../lib/physics";

interface RaccoonPhysicsState {
  x: number;
  y: number;
  angle: number;
  isDragging: boolean;
  isAnimating: boolean;
  expression: "idle" | "happy" | "surprised" | "dizzy" | "love";
}

interface UseRaccoonPhysicsOptions {
  initialPosition?: { x: number; y: number };
  containerRef: React.RefObject<HTMLElement>;
  raccoonSize?: { width: number; height: number };
  physicsConfig?: Partial<PhysicsConfig>;
  onBounce?: () => void;
  onThrow?: () => void;
}

export function useRaccoonPhysics({
  initialPosition = { x: 100, y: 100 },
  containerRef,
  raccoonSize = { width: 120, height: 120 },
  physicsConfig = {},
  onBounce,
  onThrow,
}: UseRaccoonPhysicsOptions) {
  const [state, setState] = useState<RaccoonPhysicsState>({
    x: initialPosition.x,
    y: initialPosition.y,
    angle: 0,
    isDragging: false,
    isAnimating: false,
    expression: "idle",
  });

  const physicsEngine = useRef(new PhysicsEngine(physicsConfig));
  const physicsBody = useRef<PhysicsBody>({
    x: initialPosition.x,
    y: initialPosition.y,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
  });

  const animationFrameRef = useRef<number>();
  const dragStartRef = useRef<{
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const lastPositionsRef = useRef<
    Array<{ x: number; y: number; time: number }>
  >([]);

  // Update physics config
  useEffect(() => {
    physicsEngine.current.updateConfig(physicsConfig);
  }, [physicsConfig]);

  // Animation loop
  const animate = useCallback(() => {
    if (!containerRef.current || state.isDragging) return;

    const container = containerRef.current.getBoundingClientRect();
    const result = physicsEngine.current.step(
      physicsBody.current,
      { width: container.width, height: container.height },
      raccoonSize,
    );

    if (result.bounced && onBounce) {
      onBounce();
    }

    const isAtRest = physicsEngine.current.isAtRest(physicsBody.current);

    setState((prev) => ({
      ...prev,
      x: physicsBody.current.x,
      y: physicsBody.current.y,
      angle: physicsBody.current.angle,
      isAnimating: !isAtRest,
      expression: result.bounced
        ? "dizzy"
        : isAtRest
          ? "idle"
          : prev.expression,
    }));

    if (!isAtRest) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [containerRef, raccoonSize, state.isDragging, onBounce]);

  // Start animation
  const startAnimation = useCallback(() => {
    if (!state.isAnimating && !state.isDragging) {
      setState((prev) => ({ ...prev, isAnimating: true }));
      animate();
    }
  }, [state.isAnimating, state.isDragging, animate]);

  // Handle drag start
  const handleDragStart = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;

      const container = containerRef.current.getBoundingClientRect();
      const offsetX = clientX - container.left - physicsBody.current.x;
      const offsetY = clientY - container.top - physicsBody.current.y;

      dragStartRef.current = { x: clientX, y: clientY, offsetX, offsetY };
      lastPositionsRef.current = [];

      setState((prev) => ({
        ...prev,
        isDragging: true,
        expression: "surprised",
      }));

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [containerRef],
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragStartRef.current || !containerRef.current) return;

      const container = containerRef.current.getBoundingClientRect();
      const newX = clientX - container.left - dragStartRef.current.offsetX;
      const newY = clientY - container.top - dragStartRef.current.offsetY;

      physicsEngine.current.applyDrag(physicsBody.current, newX, newY);

      // Track positions for throw velocity calculation
      const now = Date.now();
      lastPositionsRef.current.push({ x: newX, y: newY, time: now });
      if (lastPositionsRef.current.length > 5) {
        lastPositionsRef.current.shift();
      }

      setState((prev) => ({
        ...prev,
        x: newX,
        y: newY,
        angle: 0,
      }));
    },
    [containerRef],
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    if (!dragStartRef.current) return;

    setState((prev) => ({ ...prev, isDragging: false }));

    // Calculate throw velocity from recent positions
    if (lastPositionsRef.current.length >= 2) {
      const recent = lastPositionsRef.current.slice(-2);
      const dt = recent[1].time - recent[0].time;

      if (dt > 0) {
        const vx = ((recent[1].x - recent[0].x) / dt) * 20;
        const vy = ((recent[1].y - recent[0].y) / dt) * 20;

        physicsBody.current.vx = Math.max(-30, Math.min(30, vx));
        physicsBody.current.vy = Math.max(-30, Math.min(30, vy));
        physicsBody.current.angularVelocity = (Math.random() - 0.5) * 20;

        if (
          Math.abs(physicsBody.current.vx) > 5 ||
          Math.abs(physicsBody.current.vy) > 5
        ) {
          setState((prev) => ({ ...prev, expression: "happy" }));
          if (onThrow) onThrow();
        }
      }
    }

    dragStartRef.current = null;
    startAnimation();
  }, [startAnimation, onThrow]);

  // Toss the raccoon
  const toss = useCallback(() => {
    const angle = -30 - Math.random() * 30; // -30 to -60 degrees
    const power = 15 + Math.random() * 10;

    physicsEngine.current.throwObject(physicsBody.current, power, angle);
    setState((prev) => ({ ...prev, expression: "happy" }));
    startAnimation();
  }, [startAnimation]);

  // Pet the raccoon
  const pet = useCallback(() => {
    setState((prev) => ({ ...prev, expression: "love" }));
    setTimeout(() => {
      setState((prev) => ({ ...prev, expression: "idle" }));
    }, 2000);
  }, []);

  return {
    state,
    handlers: {
      onDragStart: handleDragStart,
      onDragMove: handleDragMove,
      onDragEnd: handleDragEnd,
      toss,
      pet,
    },
  };
}
