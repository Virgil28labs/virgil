import { useState, useEffect, useRef, memo, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useLocation } from '../../hooks/useLocation';
import { timeService } from '../../services/TimeService';
import { 
  PHYSICS_CONSTANTS, 
  ANIMATION_TIMINGS, 
  RACCOON_EMOJIS, 
  WEATHER_EMOJIS,
  UI_SELECTORS,
  RACCOON_SIZE,
} from '../../constants/raccoonConstants';
import { 
  RACCOON_ANIMATIONS, 
  styles, 
  getDynamicShadow, 
  getTrailStyle,
  getMascotContainerStyle,
  getRaccoonImageStyle,
} from './raccoonStyles';
import { GifModal } from './GifModal';
import { Sparkles } from './Sparkles';
import { Indicators } from './Indicators';
import type { Position, Velocity, UIElement, WallSide } from '../../types/physics.types';
const RaccoonMascot = memo(function RaccoonMascot() {
  const { address, ipLocation, hasGPSLocation, hasIpLocation } = useLocation();

  const PHYSICS = {
    ...PHYSICS_CONSTANTS,
    GROUND_Y: window.innerHeight - 100,
  };

  // Physics State
  const [position, setPosition] = useState<Position>({ x: 20, y: PHYSICS.GROUND_Y });
  const [velocity, setVelocity] = useState<Velocity>({ x: 0, y: 0 });
  const [jumpsUsed, setJumpsUsed] = useState(0);
  const [isOnWall, setIsOnWall] = useState(false);
  const [wallSide, setWallSide] = useState<WallSide>(null);
  const [charging, setCharging] = useState(false);
  const [charge, setCharge] = useState(0);

  // Interaction State
  const [isPickedUp, setIsPickedUp] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  // Visual State
  const [visualState, setVisualState] = useState({
    bounceCount: 0,
    showSparkles: false,
    showGif: false,
  });
  const [dustParticles, setDustParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const [trailPositions, setTrailPositions] = useState<Array<{ x: number; y: number; opacity: number }>>([]);
  const [isSquashing, setIsSquashing] = useState(false);

  // Animation State
  const [isSleeping, setIsSleeping] = useState(false);
  const [sleepingEmojis, setSleepingEmojis] = useState<Array<{ id: number; delay: number }>>([]);
  const [facingDirection, setFacingDirection] = useState<'left' | 'right'>('right');

  // UI Element State
  const [uiElements, setUiElements] = useState<UIElement[]>([]);
  const [isOnUIElement, setIsOnUIElement] = useState(false);
  const [currentUIElement, setCurrentUIElement] = useState<UIElement | null>(null);
  const [currentRaccoonEmoji, setCurrentRaccoonEmoji] = useState('🦝');

  // Refs
  const keys = useRef<{ left: boolean; right: boolean; jump: boolean }>({
    left: false,
    right: false,
    jump: false,
  });
  const dustParticleCounter = useRef(0);
  const lastDustTime = useRef(0);
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepEmojiTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sleepEmojiCounter = useRef(0);
  const wasOnUIElement = useRef(false);

  // Helper Functions
  const createDustParticle = useCallback((x: number, y: number) => {
    const now = timeService.getTimestamp();
    if (now - lastDustTime.current < 100) return;
    
    lastDustTime.current = now;
    const particleId = dustParticleCounter.current++;
    
    setDustParticles(prev => [...prev, { id: particleId, x, y }]);
    setTimeout(() => {
      setDustParticles(prev => prev.filter(p => p.id !== particleId));
    }, 500);
  }, []);

  const updateTrailPositions = useCallback((x: number, y: number, speed: number) => {
    if (speed > 10) {
      setTrailPositions(prev => {
        const newTrail = [{ x, y, opacity: 0.3 }, ...prev.slice(0, 2)];
        return newTrail.map((pos, index) => ({
          ...pos,
          opacity: 0.3 - (index * 0.1),
        }));
      });
    } else {
      setTrailPositions([]);
    }
  }, []);

  const startSleepingAnimation = useCallback(() => {
    sleepEmojiCounter.current = 0;

    const initialEmojis = [
      { id: sleepEmojiCounter.current++, delay: 0 },
      { id: sleepEmojiCounter.current++, delay: 0.5 },
      { id: sleepEmojiCounter.current++, delay: 1.0 },
    ];
    setSleepingEmojis(initialEmojis);
    sleepEmojiTimer.current = setInterval(() => {
      setSleepingEmojis(prev => {
        const newEmojis = prev.length >= 3 ? prev.slice(1) : prev;
        return [...newEmojis, { id: sleepEmojiCounter.current++, delay: 0 }];
      });
    }, ANIMATION_TIMINGS.SLEEP_EMOJI_INTERVAL);
  }, []);

  const handleUIElementLanding = useCallback((element: UIElement | null) => {
    if (element) {
      setIsOnUIElement(true);
      setCurrentUIElement(element);
      
      if (element.isPowerButton) {
        setCurrentRaccoonEmoji('⚡');
      } else if (element.isWeatherWidget) {
        setCurrentRaccoonEmoji(WEATHER_EMOJIS[Math.floor(Math.random() * WEATHER_EMOJIS.length)]);
      } else {
        setCurrentRaccoonEmoji(RACCOON_EMOJIS[Math.floor(Math.random() * RACCOON_EMOJIS.length)]);
      }

      if (element.element) {
        if (element.isPowerButton) {
          element.element.style.boxShadow = '0 0 25px rgba(239, 176, 194, 1), 0 0 35px rgba(244, 114, 182, 0.8)';
          element.element.style.transform = 'scale(1.2)';
          element.element.style.transition = 'all 0.3s ease';
        } else if (element.isWeatherWidget) {
          element.element.style.boxShadow = '0 0 25px rgba(108, 59, 170, 0.8), 0 0 35px rgba(139, 123, 161, 0.6)';
          element.element.style.transform = 'scale(1.1) translateY(-3px)';
          element.element.style.transition = 'all 0.3s ease';
          element.element.style.background = 'rgba(108, 59, 170, 0.15)';
          element.element.style.borderColor = 'rgba(108, 59, 170, 0.6)';
        } else if (element.isText) {
          element.element.style.textShadow = '0 0 15px rgba(108, 59, 170, 0.8)';
          element.element.style.transition = 'text-shadow 0.3s ease';
        } else {
          element.element.style.boxShadow = '0 0 20px rgba(108, 59, 170, 0.6)';
          element.element.style.transition = 'box-shadow 0.3s ease';
        }
      }
    } else {
      if (currentUIElement && currentUIElement.element) {
        if (currentUIElement.isPowerButton) {
          currentUIElement.element.style.boxShadow = '';
          currentUIElement.element.style.transform = '';
        } else if (currentUIElement.isWeatherWidget) {
          currentUIElement.element.style.boxShadow = '';
          currentUIElement.element.style.transform = '';
          currentUIElement.element.style.background = '';
          currentUIElement.element.style.borderColor = '';
        } else if (currentUIElement.isText) {
          currentUIElement.element.style.textShadow = '';
        } else {
          currentUIElement.element.style.boxShadow = '';
        }
      }
      setIsOnUIElement(false);
      setCurrentUIElement(null);
    }
  }, [currentUIElement]);

  const resetSleepTimer = useCallback(() => {
    if (sleepTimer.current) {
      clearTimeout(sleepTimer.current);
      sleepTimer.current = null;
    }
    setIsSleeping(current => {
      if (current) {
        setSleepingEmojis([]);
        if (sleepEmojiTimer.current) {
          clearInterval(sleepEmojiTimer.current);
          sleepEmojiTimer.current = null;
        }
        return false;
      }
      return current;
    });

    sleepTimer.current = setTimeout(() => {
      setPosition(currentPos => {
        setIsPickedUp(currentPickedUp => {
          setIsDragging(currentDragging => {
            setCharging(currentCharging => {
              if (!currentPickedUp && !currentDragging && !currentCharging && currentPos.y >= PHYSICS.GROUND_Y - 5) {
                setIsSleeping(true);
                startSleepingAnimation();
              }
              return currentCharging;
            });
            return currentDragging;
          });
          return currentPickedUp;
        });
        return currentPos;
      });
    }, 10000);
  }, [PHYSICS.GROUND_Y, startSleepingAnimation]);


  const uiElementsCache = useRef<{
    elements: UIElement[];
    lastUpdate: number;
    lastHash: string;
  }>({ elements: [], lastUpdate: 0, lastHash: '' });

  const createDOMHash = useCallback((): string => {
    const relevantData = [
      address?.formatted || '',
      ipLocation?.ip || '',
      hasGPSLocation.toString(),
      hasIpLocation.toString(),
      window.innerWidth,
      window.innerHeight,
    ];
    return relevantData.join('|');
  }, [address, ipLocation, hasGPSLocation, hasIpLocation]);

  const detectUIElements = useCallback((): UIElement[] => {
    const now = timeService.getTimestamp();
    const currentHash = createDOMHash();
    const cache = uiElementsCache.current;

    // Return cached result if DOM hasn't changed and cache is recent (< 1 second)
    if (cache.lastHash === currentHash && now - cache.lastUpdate < 1000) {
      return cache.elements;
    }

    const elements: UIElement[] = [];
    const textSelectors = new Set([
      '.virgil-logo',
      '.datetime-display .time',
      '.datetime-display .date',
      '.datetime-display .day',
      '.user-name',
      '.user-email',
      '.street-address',
      '.ip-address',
      '.elevation',
    ]);

    UI_SELECTORS.forEach((selector) => {
      const domElements = document.querySelectorAll(selector);
      domElements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {

          // For text elements, calculate precise text bounds
          let adjustedWidth = rect.width;
          let adjustedX = rect.left;
          let adjustedY = rect.top;
          let textBaseline = rect.top;

          if (textSelectors.has(selector)) {
            const computedStyle = window.getComputedStyle(element);
            const textAlign = computedStyle.textAlign;
            const fontSize = parseFloat(computedStyle.fontSize);

            const textContent = (element.textContent || '').trim();
            const estimatedWidth = textContent.length * fontSize * 0.6; // Rough approximation

            if (textAlign === 'center') {
              adjustedX = rect.left + (rect.width - estimatedWidth) / 2;
            } else if (textAlign === 'right') {
              adjustedX = rect.right - estimatedWidth;
            } else {
              adjustedX = rect.left;
            }

            adjustedY = rect.top;
            textBaseline = rect.top + fontSize * 0.8;
            adjustedWidth = Math.min(estimatedWidth, rect.width);
          }

          elements.push({
            id: `${selector.replace(/[.\s]/g, '')}_${index}`,
            type: selector,
            x: adjustedX,
            y: adjustedY,
            width: adjustedWidth,
            height: rect.height,
            bottom: rect.bottom,
            right: adjustedX + adjustedWidth,
            element: element as HTMLElement,
            textBaseline: textBaseline,
            isText: textSelectors.has(selector),
            isPowerButton: selector === '.power-button',
            isWeatherWidget: selector === '.weather-widget',
          });
        }
      });
    });

    // Update cache
    uiElementsCache.current = {
      elements,
      lastUpdate: now,
      lastHash: currentHash,
    };

    return elements;
  }, [createDOMHash]);

  const handleClick = () => {
    resetSleepTimer();
    setVisualState((prev) => ({ ...prev, showGif: true }));

    if (!isPickedUp) {
      setIsPickedUp(true);
      setVisualState((prev) => ({
        ...prev,
        bounceCount: prev.bounceCount + 1,
        showSparkles: true,
      }));

      setTimeout(() => setVisualState((prev) => ({ ...prev, showSparkles: false })), 1000);
      setTimeout(() => {
        setIsPickedUp(false);
        setPosition({
          x: Math.random() * (window.innerWidth - 100),
          y: PHYSICS.GROUND_Y,
        });
        setVelocity({ x: 0, y: 0 });
        setJumpsUsed(0);
        setIsOnWall(false);
        setWallSide(null);
        setCharge(0);
        setCharging(false);
      }, 2000);
    }
  };

  const handleCloseGif = () => {
    setVisualState((prev) => ({ ...prev, showGif: false }));
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (isPickedUp) return;

    resetSleepTimer();

    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
    });
    setVelocity({ x: 0, y: 0 });
  }, [isDragging, dragOffset.x, dragOffset.y]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

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
  }, [isDragging, dragOffset, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    const updateUIElements = () => {
      setUiElements(detectUIElements());
    };

    // Initial detection
    updateUIElements();

    // Update on resize (more responsive than before)
    const handleResize = () => {
      // Clear cache on resize to force recomputation
      uiElementsCache.current.lastHash = '';
      updateUIElements();
    };

    window.addEventListener('resize', handleResize);

    // Reduced frequency since we now have smart caching (5 seconds instead of 2)
    const interval = setInterval(updateUIElements, 5000);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(interval);
    };
  }, [detectUIElements]);

  // Update visual effects based on physics
  useEffect(() => {
    const isRunning = velocity.x !== 0;
    
    // Update facing direction
    if (velocity.x < 0) {
      setFacingDirection('left');
    } else if (velocity.x > 0) {
      setFacingDirection('right');
    }
    
    // Create dust particles when running on ground
    if (isRunning && position.y >= PHYSICS.GROUND_Y - 5) {
      createDustParticle(position.x + 40, position.y + 70);
    }
    
    // Calculate speed for effects
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    updateTrailPositions(position.x, position.y, speed);
    
    // Add squash effect on landing
    if (velocity.y > 5 && position.y >= PHYSICS.GROUND_Y - 1) {
      setIsSquashing(true);
      setTimeout(() => setIsSquashing(false), 200);
    }
  }, [position, velocity, PHYSICS.GROUND_Y, createDustParticle, updateTrailPositions]);



  // Charge effect
  useEffect(() => {
    let chargeInterval: ReturnType<typeof setTimeout>;
    if (charging && charge < PHYSICS_CONSTANTS.CHARGE_MAX) {
      chargeInterval = setInterval(() => {
        setCharge(c => Math.min(PHYSICS_CONSTANTS.CHARGE_MAX, c + PHYSICS_CONSTANTS.CHARGE_RATE));
      }, 16);
    }
    return () => clearInterval(chargeInterval);
  }, [charging, charge]);

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

      setPosition(prev => {
        let { x, y } = prev;
        let vx = velocity.x;
        let vy = velocity.y;

        // Check if on ground or UI element for acceleration calculation
        const isGrounded = y >= PHYSICS.GROUND_Y || currentUIElement !== null;
        const acceleration = isGrounded ? PHYSICS_CONSTANTS.ACCELERATION : PHYSICS_CONSTANTS.ACCELERATION * PHYSICS_CONSTANTS.AIR_CONTROL;

        // Horizontal movement with acceleration
        if (keys.current.left) {
          vx = Math.max(vx - acceleration, -PHYSICS_CONSTANTS.MOVE_SPEED);
        } else if (keys.current.right) {
          vx = Math.min(vx + acceleration, PHYSICS_CONSTANTS.MOVE_SPEED);
        } else {
          // Apply friction when no keys pressed
          if (Math.abs(vx) > 0.1) {
            vx *= PHYSICS_CONSTANTS.FRICTION;
          } else {
            vx = 0; // Stop completely when very slow
          }
        }
        x += vx;

        // Wall collision detection
        const hitLeftWall = x <= 0;
        const hitRightWall = x >= window.innerWidth - RACCOON_SIZE.WIDTH;

        if (hitLeftWall) {
          x = 0;
          if (vy > 0 && keys.current.jump) {
            setIsOnWall(true);
            setWallSide('left');
            vy = Math.min(vy, PHYSICS_CONSTANTS.WALL_STICK_FORCE);
          } else {
            setIsOnWall(false);
          }
        } else if (hitRightWall) {
          x = window.innerWidth - RACCOON_SIZE.WIDTH;
          if (vy > 0 && keys.current.jump) {
            setIsOnWall(true);
            setWallSide('right');
            vy = Math.min(vy, PHYSICS_CONSTANTS.WALL_STICK_FORCE);
          } else {
            setIsOnWall(false);
          }
        } else {
          setIsOnWall(false);
          setWallSide(null);
        }

        // Gravity
        if (isOnWall && keys.current.jump) {
          vy += PHYSICS_CONSTANTS.GRAVITY * 0.3;
        } else {
          vy += PHYSICS_CONSTANTS.GRAVITY;
        }
        
        // Apply terminal velocity cap
        vy = Math.min(vy, PHYSICS_CONSTANTS.TERMINAL_VELOCITY);
        
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
              y = uiElement.y - RACCOON_SIZE.HEIGHT;
              vy = 0;
              setJumpsUsed(0);
              setIsOnWall(false);
              setWallSide(null);

              if (!wasOnUIElement.current) {
                handleUIElementLanding(uiElement);
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
          handleUIElementLanding(null);
        }

        // Ground collision
        if (!landedOnUI && y >= PHYSICS.GROUND_Y) {
          y = PHYSICS.GROUND_Y;
          vy = 0;
          setJumpsUsed(0);
          setIsOnWall(false);
          setWallSide(null);
        }

        // Jumping logic
        if ((y >= PHYSICS.GROUND_Y || landedOnUI) && !charging) {
          if (charge > 0) {
            vy = -PHYSICS_CONSTANTS.JUMP_FORCE * (1 + charge);
            setCharge(0);
          } else if (keys.current.jump && jumpsUsed < PHYSICS_CONSTANTS.MAX_JUMPS && !charging) {
            vy = -PHYSICS_CONSTANTS.JUMP_FORCE;
            setJumpsUsed(1);
          }
        } else if (!landedOnUI && y < PHYSICS.GROUND_Y) {
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
        y = Math.min(y, PHYSICS.GROUND_Y);

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
    velocity.x,
    velocity.y,
    jumpsUsed,
    isOnWall,
    wallSide,
    charging,
    charge,
    uiElements,
    currentUIElement,
    handleUIElementLanding,
    PHYSICS.GROUND_Y,
  ]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPickedUp) return;
      resetSleepTimer();

      if (e.key === ' ' || e.key === 'Spacebar') {
        keys.current.jump = true;
        // Start charging if on ground
        if (position.y >= PHYSICS.GROUND_Y && !charging) {
          setCharging(true);
        }
      } else if (e.key === 'ArrowLeft') {
        keys.current.left = true;
      } else if (e.key === 'ArrowRight') {
        keys.current.right = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        keys.current.jump = false;
        if (charging) {
          setCharging(false);
        }
      } else if (e.key === 'ArrowLeft') {
        keys.current.left = false;
      } else if (e.key === 'ArrowRight') {
        keys.current.right = false;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPickedUp, resetSleepTimer, position.y, charging, PHYSICS.GROUND_Y]);


  // Initialize sleep timer and cleanup
  useEffect(() => {
    // Start initial sleep timer
    resetSleepTimer();

    // Cleanup timers on unmount
    return () => {
      if (sleepTimer.current) {
        clearTimeout(sleepTimer.current);
      }
      if (sleepEmojiTimer.current) {
        clearInterval(sleepEmojiTimer.current);
      }
    };
  }, [resetSleepTimer]); // Only run on mount/unmount


  return (
    <>
      <style>{RACCOON_ANIMATIONS}</style>
      <div
        data-testid="raccoon-mascot"
        style={{
          ...styles.mainContainer(isPickedUp),
          left: position.x,
          top: position.y,
        }}
      >
        {/* Dynamic shadow */}
        {!isPickedUp && (
          <div style={getDynamicShadow(PHYSICS.GROUND_Y, position.y)} />
        )}
        {/* Sparkles effect */}
        <Sparkles show={visualState.showSparkles} />

        {/* Dust particles */}
        {dustParticles.map((particle) => (
          <div
            key={particle.id}
            style={{
              ...styles.dustParticle,
              left: particle.x - position.x,
              top: particle.y - position.y,
            }}
          />
        ))}

        {/* Trail effect for fast movement */}
        {trailPositions.map((trail, index) => (
          <div
            key={index}
            style={getTrailStyle(trail.x, trail.y, trail.opacity, index)}
          >
            <img
              src="/racoon.png"
              alt=""
              style={styles.trailImage(facingDirection)}
              draggable={false}
            />
          </div>
        ))}

        {/* Sleeping zzz emojis */}
        {isSleeping && sleepingEmojis.map((emoji) => (
          <div
            key={emoji.id}
            style={{
              ...styles.sleepEmoji,
              animationDelay: `${emoji.delay}s`,
            }}
          >
            💤
          </div>
        ))}

        {/* Indicators */}
        <Indicators 
          isOnWall={isOnWall} 
          isOnUIElement={isOnUIElement} 
          currentRaccoonEmoji={currentRaccoonEmoji} 
        />

        {/* Mascot image */}
        <div
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          style={getMascotContainerStyle(
            isPickedUp,
            velocity,
            isSquashing,
            isOnUIElement,
            visualState,
            charging,
            charge,
            isSleeping,
            velocity.x !== 0,
          )}
          title={
            isPickedUp
              ? "I'm being held! 🦝💕"
              : 'Click to pick up, use ← → to run, space to jump (triple jump available)!'
          }
        >
          <img
            src="/racoon.png"
            alt="Racoon Mascot"
            style={getRaccoonImageStyle(facingDirection)}
            draggable={false}
          />
        </div>

        {/* Bounce counter */}
        {visualState.bounceCount > 0 && (
          <div
            style={{
              ...styles.counter,
              ...styles.bounceCounter,
            }}
          >
            {visualState.bounceCount}
          </div>
        )}

        {/* Jump counter */}
        {jumpsUsed > 0 && (
          <div
            style={{
              ...styles.counter,
              ...styles.jumpCounter,
              top: isOnWall ? -45 : -30,
            }}
          >
            {jumpsUsed}
          </div>
        )}

        {/* Charge bar */}
        {charging && (
          <div style={styles.chargeBar}>
            <div
              style={{
                ...styles.chargeFill,
                width: `${(charge / PHYSICS.CHARGE_MAX) * 100}%`,
              }}
            />
          </div>
        )}

        {/* GIF Modal */}
        <GifModal show={visualState.showGif} onClose={handleCloseGif} />
      </div>
    </>
  );
});

export { RaccoonMascot };
