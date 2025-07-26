import { useRef, memo, useCallback, useEffect } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useLocation } from '../hooks/useLocation';
import { useRaccoonPhysics } from '../hooks/useRaccoonPhysics';
import { useUIElementDetection } from '../hooks/useUIElementDetection';
import { useRaccoonAnimations } from '../hooks/useRaccoonAnimations';
import { useRaccoonControls } from '../hooks/useRaccoonControls';
import { PHYSICS_CONSTANTS, TIMING_CONSTANTS } from '../constants/raccoonConstants';
import styles from '../styles/RaccoonMascot.module.css';

/**
 * 🦝 Interactive Raccoon Mascot Component for Virgil
 *
 * Features:
 * - Physics-based movement with gravity and collision detection
 * - Arrow key controls for movement, spacebar for jumping
 * - Triple jump capability with wall sticking mechanics
 * - Power charge system (hold space on ground for stronger jumps)
 * - UI element interaction (can land on and sit on text elements)
 * - Random emoji display when sitting on text
 * - Click interactions and drag & drop functionality
 * - Brand-consistent purple color scheme
 */
const RaccoonMascotRefactored = memo(function RaccoonMascotRefactored() {
  // Refs
  const raccoonRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const clickCountRef = useRef(0);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Location data for dynamic hit box updates
  const { address, ipLocation, hasGPSLocation, hasIpLocation } = useLocation();

  // Initialize physics hook
  const physics = useRaccoonPhysics({
    containerRef: raccoonRef,
    getAddressText: () => {
      if (hasGPSLocation && address) {
        return `${address.city}, ${address.state} 📍`;
      } else if (hasIpLocation && ipLocation) {
        return `${ipLocation.city}, ${ipLocation.region} 🌐`;
      }
      return 'Unknown Location 🗺️';
    },
  });

  // Initialize UI element detection hook
  const uiElements = useUIElementDetection({
    position: physics.position,
    isPickedUp: physics.isPickedUp,
    isDragging: physics.isDragging,
  });

  // Initialize animations hook
  const animations = useRaccoonAnimations({
    isOnGround: physics.isOnGround,
    isMoving: physics.isMoving,
    isPickedUp: physics.isPickedUp,
    isDragging: physics.isDragging,
    charging: physics.charging,
  });

  // Initialize controls hook
  const controls = useRaccoonControls({
    isOnGround: physics.isOnGround,
    wallStickSide: physics.wallStickSide,
    jumpCount: physics.jumpCount,
    actions: {
      startMoving: physics.actions.startMoving,
      stopMoving: physics.actions.stopMoving,
      startJump: physics.actions.startJump,
      startCharging: physics.actions.startCharging,
      stopCharging: physics.actions.stopCharging,
      releaseCharge: physics.actions.releaseCharge,
      startDrag: physics.actions.startDrag,
      drag: physics.actions.drag,
      stopDrag: physics.actions.stopDrag,
    },
    animations: {
      setFacingDirection: animations.actions.setFacingDirection,
      setRunning: animations.actions.setIsRunning,
      resetSleepTimer: animations.actions.resetSleepTimer,
    },
  });

  // Handle raccoon click
  const handleRaccoonClick = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Clear existing timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    // Track click count
    clickCountRef.current++;
    const clickCount = clickCountRef.current;
    
    // Reset click count after delay
    clickTimeoutRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, TIMING_CONSTANTS.DOUBLE_CLICK_DELAY);
    
    // Handle first click
    if (clickCount === 1) {
      physics.actions.handleClick();
    }
    // Handle double click
    else if (clickCount === 2) {
      animations.actions.showPickupAnimation();
    }
  }, [physics.actions, animations.actions]);

  // Update physics on UI element changes
  useEffect(() => {
    physics.actions.setClosestElement(uiElements.closestElement);
  }, [uiElements.closestElement, physics.actions]);

  // Handle landing on UI elements
  useEffect(() => {
    if (physics.isOnGround && uiElements.closestElement) {
      const element = uiElements.closestElement;
      if (Math.abs(physics.position.x - element.x) < element.width / 2 &&
          Math.abs(physics.position.y - element.y) < 5) {
        animations.actions.handleUIElementLanding(element);
      }
    } else if (!physics.isOnGround || !uiElements.closestElement) {
      animations.actions.handleUIElementLanding(null);
    }
  }, [physics.isOnGround, physics.position, uiElements.closestElement, animations.actions]);

  // Main animation loop
  useEffect(() => {
    const animate = () => {
      physics.actions.updatePhysics();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [physics.actions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  // Calculate transform styles
  const transformStyle = `translate(${physics.position.x}px, ${physics.position.y}px) scaleX(${animations.movement.facingDirection === 'left' ? -1 : 1})`;

  return (
    <>
      {/* Main Raccoon Container */}
      <div
        ref={raccoonRef}
        className={`${styles.raccoonContainer} ${
          physics.isDragging ? styles.dragging : ''
        } ${physics.isPickedUp ? styles.pickedUp : ''} ${
          animations.sleepState.isSleeping ? styles.sleeping : ''
        } ${physics.wallStickSide ? styles.wallStick : ''} ${
          animations.movement.isRunning ? styles.running : ''
        } ${!physics.isOnGround && !physics.wallStickSide ? styles.jumping : ''} ${
          physics.charging ? styles.charging : ''
        } ${animations.uiInteraction.isOnUIElement ? styles.sitting : ''}`}
        style={{
          transform: transformStyle,
          zIndex: physics.isDragging ? 10001 : 9999,
        }}
        onClick={handleRaccoonClick}
        onMouseDown={controls.onMouseDown}
        role="img"
        aria-label="Interactive raccoon mascot"
      >
        {/* Sleeping Z's */}
        {animations.sleepState.isSleeping && (
          <div className={styles.sleepingEmojis}>
            {animations.sleepState.sleepingEmojis.map((emoji) => (
              <span
                key={emoji.id}
                className={styles.sleepingEmoji}
                style={{ animationDelay: `${emoji.delay}s` }}
              >
                💤
              </span>
            ))}
          </div>
        )}

        {/* Raccoon emoji (shows custom emoji when on UI element) */}
        <span className={styles.raccoonEmoji}>
          {animations.uiInteraction.isOnUIElement ? animations.uiInteraction.currentRaccoonEmoji : '🦝'}
        </span>

        {/* Charge indicator */}
        {physics.charging && (
          <div 
            className={styles.chargeIndicator}
            style={{
              transform: `scale(${0.5 + physics.chargeLevel * 0.5})`,
              opacity: physics.chargeLevel,
            }}
          />
        )}

        {/* Triple jump indicator */}
        {physics.jumpCount > 0 && !physics.isOnGround && (
          <div className={styles.jumpIndicator}>
            {Array.from({ length: PHYSICS_CONSTANTS.MAX_JUMPS - physics.jumpCount }).map((_, i) => (
              <span key={i} className={styles.jumpDot} />
            ))}
            {Array.from({ length: physics.jumpCount }).map((_, i) => (
              <span key={i} className={`${styles.jumpDot} ${styles.active}`} />
            ))}
          </div>
        )}

        {/* Wall stick indicator */}
        {physics.wallStickSide && (
          <div className={`${styles.wallStickIndicator} ${styles[physics.wallStickSide]}`}>
            <span>🐾</span>
          </div>
        )}

        {/* Sparkle effect */}
        {animations.visualState.showSparkles && (
          <div className={styles.sparkleContainer}>
            {[...Array(6)].map((_, i) => (
              <span key={i} className={styles.sparkle} style={{ animationDelay: `${i * 0.1}s` }}>
                ✨
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Location Hit Box */}
      {physics.showHitBox && (
        <div 
          className={styles.hitBox}
          style={{
            left: physics.hitBox.x,
            top: physics.hitBox.y,
            width: physics.hitBox.width,
            height: physics.hitBox.height,
          }}
        >
          <div className={styles.hitBoxText}>{physics.hitBox.text}</div>
        </div>
      )}

      {/* GIF Modal */}
      {animations.visualState.showGif && (
        <div className={styles.gifModal} onClick={animations.actions.hideGif}>
          <img 
            src="https://media.giphy.com/media/ViIh8qu8Y08swHV7dX/giphy.gif" 
            alt="Happy raccoon"
            className={styles.gifImage}
          />
          <p className={styles.gifText}>You found a happy raccoon! 🦝</p>
          <p className={styles.bounceCount}>Bounce count: {animations.visualState.bounceCount}</p>
        </div>
      )}
    </>
  );
});

export default RaccoonMascotRefactored;