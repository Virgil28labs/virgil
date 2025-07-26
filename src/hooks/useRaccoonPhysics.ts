import { useState, useEffect, useRef, useCallback } from 'react';
import { PhysicsEngine } from '../lib/physics';
import { PHYSICS_CONSTANTS, RACCOON_SIZE } from '../constants/raccoonConstants';
import type { Position, Velocity, UIElement } from '../types/physics.types';

interface UseRaccoonPhysicsProps {
  isPickedUp: boolean;
  isDragging: boolean;
  uiElements: UIElement[];
  currentUIElement: UIElement | null;
  onUIElementLanding: (element: UIElement | null) => void;
}

interface UseRaccoonPhysicsReturn {
  position: Position;
  velocity: Velocity;
  jumpsUsed: number;
  isOnWall: boolean;
  charging: boolean;
  charge: number;
  physicsGround: number;
  actions: {
    setPosition: (pos: Position) => void;
    setVelocity: (vel: Velocity) => void;
    jump: () => void;
    startCharge: () => void;
    releaseCharge: () => void;
    moveLeft: () => void;
    moveRight: () => void;
    stopMoving: () => void;
    resetPhysics: () => void;
  };
}

export const useRaccoonPhysics = ({
  isPickedUp,
  isDragging,
  uiElements,
  currentUIElement,
  onUIElementLanding,
}: UseRaccoonPhysicsProps): UseRaccoonPhysicsReturn => {
  // Dynamic physics ground position (needs to update on resize)
  const [physicsGround, setPhysicsGround] = useState(window.innerHeight - 100);

  // Physics State
  const [position, setPosition] = useState<Position>({ x: 20, y: physicsGround });
  const [velocity, setVelocity] = useState<Velocity>({ x: 0, y: 0 });
  const [jumpsUsed, setJumpsUsed] = useState<number>(0);
  const [isOnWall, setIsOnWall] = useState<boolean>(false);
  const [charging, setCharging] = useState<boolean>(false);
  const [charge, setCharge] = useState<number>(0);

  // Physics engine instance (kept for potential future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const physicsEngine = useRef(new PhysicsEngine({
    gravity: PHYSICS_CONSTANTS.GRAVITY,
    friction: 0.98,
    bounceDamping: 0.6,
    angularDamping: 0.95,
    groundLevel: 100,
  }));

  // Movement state
  const keys = useRef<{ left: boolean; right: boolean; jump: boolean }>({
    left: false,
    right: false,
    jump: false,
  });

  // Track previous UI element state
  const wasOnUIElement = useRef<boolean>(false);

  // Update ground position on resize
  useEffect(() => {
    const handleResize = () => {
      const newGround = window.innerHeight - 100;
      setPhysicsGround(newGround);
      setPosition((prev) => ({
        x: Math.max(0, Math.min(prev.x, window.innerWidth - RACCOON_SIZE.WIDTH)),
        y: Math.min(prev.y, window.innerHeight - RACCOON_SIZE.HEIGHT, newGround),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Charge effect
  useEffect(() => {
    let chargeInterval: ReturnType<typeof setTimeout>;
    if (charging && charge < PHYSICS_CONSTANTS.CHARGE_MAX) {
      chargeInterval = setInterval(() => {
        setCharge((c) => Math.min(PHYSICS_CONSTANTS.CHARGE_MAX, c + PHYSICS_CONSTANTS.CHARGE_RATE));
      }, 16);
    }
    return () => clearInterval(chargeInterval);
  }, [charging, charge]);

  // Action handlers
  const jump = useCallback(() => {
    if (position.y >= physicsGround || currentUIElement) {
      keys.current.jump = true;
    }
  }, [position.y, physicsGround, currentUIElement]);

  const startCharge = useCallback(() => {
    if (position.y >= physicsGround && !charging) {
      setCharging(true);
    }
  }, [position.y, physicsGround, charging]);

  const releaseCharge = useCallback(() => {
    if (charging) {
      setCharging(false);
    }
    keys.current.jump = false;
  }, [charging]);

  const moveLeft = useCallback(() => {
    keys.current.left = true;
  }, []);

  const moveRight = useCallback(() => {
    keys.current.right = true;
  }, []);

  const stopMoving = useCallback(() => {
    keys.current.left = false;
    keys.current.right = false;
  }, []);

  const resetPhysics = useCallback(() => {
    setVelocity({ x: 0, y: 0 });
    setJumpsUsed(0);
    setIsOnWall(false);
    setCharge(0);
    setCharging(false);
  }, []);

  // Main physics loop
  useEffect(() => {
    if (isPickedUp || isDragging) return;

    let animationFrame: number;
    const frameTime = 1000 / 60;
    let lastTime = 0;

    const step = (currentTime: number) => {
      if (currentTime - lastTime < frameTime) {
        animationFrame = requestAnimationFrame(step);
        return;
      }
      lastTime = currentTime;

      setPosition((prev) => {
        let { x, y } = prev;
        let vx = 0;
        let vy = velocity.y;

        // Horizontal movement
        if (keys.current.left) {
          vx = -PHYSICS_CONSTANTS.MOVE_SPEED;
        }
        if (keys.current.right) {
          vx = PHYSICS_CONSTANTS.MOVE_SPEED;
        }
        x += vx;

        // Wall collision detection
        const hitLeftWall = x <= 0;
        const hitRightWall = x >= window.innerWidth - RACCOON_SIZE.WIDTH;

        if (hitLeftWall) {
          x = 0;
          if (vy > 0 && keys.current.jump) {
            setIsOnWall(true);
            vy = Math.min(vy, PHYSICS_CONSTANTS.WALL_STICK_FORCE);
          } else {
            setIsOnWall(false);
          }
        } else if (hitRightWall) {
          x = window.innerWidth - RACCOON_SIZE.WIDTH;
          if (vy > 0 && keys.current.jump) {
            setIsOnWall(true);
            vy = Math.min(vy, PHYSICS_CONSTANTS.WALL_STICK_FORCE);
          } else {
            setIsOnWall(false);
          }
        } else {
          setIsOnWall(false);
        }

        // Gravity
        if (isOnWall && keys.current.jump) {
          vy += PHYSICS_CONSTANTS.GRAVITY * 0.3;
        } else {
          vy += PHYSICS_CONSTANTS.GRAVITY;
        }
        y += vy;

        // UI Element Collision Detection
        let landedOnUI = false;

        for (const uiElement of uiElements) {
          const raccoonRight = x + RACCOON_SIZE.WIDTH;
          const raccoonBottom = y + RACCOON_SIZE.HEIGHT;
          const raccoonTop = y;

          // Check for ceiling collision
          if (
            raccoonRight > uiElement.x &&
            x < uiElement.right &&
            raccoonTop < uiElement.bottom &&
            raccoonBottom > uiElement.bottom &&
            vy < 0
          ) {
            y = uiElement.bottom;
            vy = 0;
            continue;
          }

          // Check if raccoon is landing on top of UI element
          if (
            raccoonRight > uiElement.x &&
            x < uiElement.right &&
            raccoonBottom > uiElement.y &&
            y < uiElement.bottom &&
            vy > 0
          ) {
            if (y < uiElement.y - 20) {
              if (uiElement.isText) {
                y = uiElement.y - RACCOON_SIZE.HEIGHT;
              } else {
                y = uiElement.y - RACCOON_SIZE.HEIGHT;
              }

              vy = 0;
              setJumpsUsed(0);
              setIsOnWall(false);

              if (!wasOnUIElement.current) {
                onUIElementLanding(uiElement);
              }

              landedOnUI = true;
              break;
            } else {
              // Side collision
              if (vx > 0) {
                x = uiElement.x - RACCOON_SIZE.WIDTH;
                vx = 0;
              } else if (vx < 0) {
                x = uiElement.right;
                vx = 0;
              }
            }
          }
        }

        // Clear UI element if not landed
        if (!landedOnUI && wasOnUIElement.current) {
          onUIElementLanding(null);
        }

        // Ground collision
        if (!landedOnUI && y >= physicsGround) {
          y = physicsGround;
          vy = 0;
          setJumpsUsed(0);
          setIsOnWall(false);
        }

        // Jumping logic
        if ((y >= physicsGround || landedOnUI) && !charging) {
          if (charge > 0) {
            vy = -PHYSICS_CONSTANTS.JUMP_FORCE * (1 + charge);
            setCharge(0);
          } else if (keys.current.jump && jumpsUsed < PHYSICS_CONSTANTS.MAX_JUMPS && !charging) {
            vy = -PHYSICS_CONSTANTS.JUMP_FORCE;
            setJumpsUsed(1);
          }
        } else if (!landedOnUI && y < physicsGround) {
          // Air jumps
          if (keys.current.jump && jumpsUsed === 1 && vy > 0) {
            vy = -PHYSICS_CONSTANTS.JUMP_FORCE * 0.8;
            setJumpsUsed(2);
          } else if (keys.current.jump && jumpsUsed === 2 && vy > 0) {
            vy = -PHYSICS_CONSTANTS.JUMP_FORCE * 0.6;
            setJumpsUsed(3);
          }
        }

        // Keep in bounds
        x = Math.max(0, Math.min(x, window.innerWidth - RACCOON_SIZE.WIDTH));
        y = Math.min(y, physicsGround);

        setVelocity({ x: vx, y: vy });
        wasOnUIElement.current = landedOnUI;

        return { x, y };
      });

      animationFrame = requestAnimationFrame(step);
    };

    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [
    isPickedUp,
    isDragging,
    velocity.y,
    jumpsUsed,
    isOnWall,
    charging,
    charge,
    physicsGround,
    uiElements,
    onUIElementLanding,
  ]);

  return {
    position,
    velocity,
    jumpsUsed,
    isOnWall,
    charging,
    charge,
    physicsGround,
    actions: {
      setPosition,
      setVelocity,
      jump,
      startCharge,
      releaseCharge,
      moveLeft,
      moveRight,
      stopMoving,
      resetPhysics,
    },
  };
};
