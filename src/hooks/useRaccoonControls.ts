import { useState, useEffect, useCallback, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Position } from '../types/physics.types';

interface UseRaccoonControlsProps {
  isPickedUp: boolean;
  onMove: (direction: 'left' | 'right' | 'stop') => void;
  onJump: () => void;
  onStartCharge: () => void;
  onReleaseCharge: () => void;
  onResetSleepTimer: () => void;
  onPickup: () => void;
  onDrop: () => void;
  onPositionChange: (position: Position) => void;
}

interface UseRaccoonControlsReturn {
  isDragging: boolean;
  dragOffset: Position;
  handlers: {
    handleClick: () => void;
    handleMouseDown: (e: ReactMouseEvent<HTMLDivElement>) => void;
  };
}

export const useRaccoonControls = ({
  isPickedUp,
  onMove,
  onJump,
  onStartCharge,
  onReleaseCharge,
  onResetSleepTimer,
  onPickup,
  onDrop,
  onPositionChange,
}: UseRaccoonControlsProps): UseRaccoonControlsReturn => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  // Track key states to handle multiple keys pressed
  const keysPressed = useRef<Set<string>>(new Set());

  /**
   * Handle click to pick up and show GIF
   */
  const handleClick = useCallback(() => {
    // Reset sleep timer on interaction
    onResetSleepTimer();

    if (!isPickedUp) {
      onPickup();

      // Drop after 2 seconds (handled in parent component)
      setTimeout(() => {
        onDrop();
      }, 2000);
    }
  }, [isPickedUp, onPickup, onDrop, onResetSleepTimer]);

  /**
   * Handle drag start
   */
  const handleMouseDown = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (isPickedUp) return;

    // Reset sleep timer on drag interaction
    onResetSleepTimer();

    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, [isPickedUp, onResetSleepTimer]);

  /**
   * Handle drag move
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    onPositionChange({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
  }, [isDragging, dragOffset, onPositionChange]);

  /**
   * Handle drag end
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle keyboard controls
  useEffect(() => {
    // Capture the keysPressed ref value to use in cleanup
    const keysSet = keysPressed.current;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPickedUp) return;

      // Reset sleep timer on any keyboard activity
      onResetSleepTimer();

      // Prevent multiple calls for held keys
      if (keysSet.has(e.key)) return;
      keysSet.add(e.key);

      switch (e.key) {
        case ' ':
        case 'Spacebar':
          onStartCharge();
          onJump();
          break;
        case 'ArrowLeft':
          onMove('left');
          break;
        case 'ArrowRight':
          onMove('right');
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysSet.delete(e.key);

      switch (e.key) {
        case ' ':
        case 'Spacebar':
          onReleaseCharge();
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
          // Check if no movement keys are pressed
          if (!keysSet.has('ArrowLeft') && !keysSet.has('ArrowRight')) {
            onMove('stop');
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      // Clear keys on cleanup to prevent stuck states
      keysSet.clear();
    };
  }, [isPickedUp, onMove, onJump, onStartCharge, onReleaseCharge, onResetSleepTimer]);

  return {
    isDragging,
    dragOffset,
    handlers: {
      handleClick,
      handleMouseDown,
    },
  };
};
