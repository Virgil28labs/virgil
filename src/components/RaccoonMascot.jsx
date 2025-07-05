import { useState, useEffect, useRef } from 'react';

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
export function RaccoonMascot() {
  // Physics Constants
  const GROUND_Y = window.innerHeight - 100;
  const GRAVITY = 1.2;
  const JUMP_FORCE = 20;
  const MOVE_SPEED = 8;
  const MAX_JUMPS = 3;
  const WALL_STICK_FORCE = 0.3;
  const CHARGE_MAX = 1.5;
  const CHARGE_RATE = 0.015;

  // Emoji Arrays
  const mascots = ['🦝', '🦝', '🦝', '🦝', '🦝'];
  const raccoonEmojis = ['🦝', '🐾', '🍃', '🌰', '🗑️', '🌙', '🐻', '🍯'];
  
  /**
   * Returns a random raccoon-related emoji for text bubble display
   * @returns {string} Random emoji from raccoonEmojis array
   */
  const getRandomRaccoonEmoji = () => {
    return raccoonEmojis[Math.floor(Math.random() * raccoonEmojis.length)];
  };

  // Physics State
  const [position, setPosition] = useState({ x: 20, y: GROUND_Y });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });
  const [jumpsUsed, setJumpsUsed] = useState(0);
  const [isOnWall, setIsOnWall] = useState(false);
  const [wallSide, setWallSide] = useState(null);
  
  // Interaction State
  const [isPickedUp, setIsPickedUp] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [charge, setCharge] = useState(0);
  const [charging, setCharging] = useState(false);
  
  // Visual State
  const [bounceCount, setBounceCount] = useState(0);
  const [showSparkles, setShowSparkles] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [currentMascot, setCurrentMascot] = useState(0);
  
  // UI Element Interaction State
  const [uiElements, setUiElements] = useState([]);
  const [isOnUIElement, setIsOnUIElement] = useState(false);
  const [currentUIElement, setCurrentUIElement] = useState(null);
  const [currentRaccoonEmoji, setCurrentRaccoonEmoji] = useState('🦝');
  
  // Refs
  const mascotRef = useRef(null);
  const keys = useRef({ left: false, right: false, jump: false });
  const wasOnUIElement = useRef(false);

  /**
   * Detects and measures UI elements that the raccoon can interact with
   * Uses Canvas API for precise text measurement and creates collision boundaries
   * @returns {Array} Array of UI element objects with position and size data
   */
  const detectUIElements = () => {
    const elements = [];
    
    // Target selectors for different UI elements
    const selectors = [
      '.user-name',           // "Ben" text
      '.user-email',          // Email text  
      '.user-created',        // Member since text
      '.sign-out-icon',       // Power button
      '.auth-page header h1', // "Virgil" header on auth page
      '.auth-toggle button',  // Login/Sign Up buttons
      '.login-form button',   // Login button
      '.signup-form button',  // Sign up button
      '.form-group input'     // Text input fields
    ];
    
    selectors.forEach(selector => {
      const domElements = document.querySelectorAll(selector);
      domElements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) { // Only visible elements
          
          // For text elements, calculate precise text bounds
          let adjustedWidth = rect.width;
          let adjustedX = rect.left;
          let adjustedY = rect.top;
          let textBaseline = rect.top;
          
          if (selector === '.user-name' || selector === '.user-email' || selector === '.user-created' || selector === '.auth-page header h1') {
            // Get precise text measurements
            const computedStyle = window.getComputedStyle(element);
            const fontSize = parseFloat(computedStyle.fontSize);
            const textContent = (element.textContent || element.innerText).trim();
            
            // Create canvas for precise text measurement
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            context.font = `${computedStyle.fontWeight} ${fontSize}px ${computedStyle.fontFamily}`;
            
            // Get text metrics
            const metrics = context.measureText(textContent);
            const textWidth = metrics.width;
            
            // Calculate actual text bounds
            // Text baseline is typically at 0.8 * fontSize from top
            const textHeight = fontSize;
            const baselineOffset = fontSize * 0.2; // Approximate top padding above characters
            
            // Get element's text alignment
            const textAlign = computedStyle.textAlign;
            
            // Calculate precise X position based on text alignment
            if (textAlign === 'center' || element.style.textAlign === 'center') {
              adjustedX = rect.left + (rect.width - textWidth) / 2;
            } else if (textAlign === 'right') {
              adjustedX = rect.right - textWidth;
            } else {
              adjustedX = rect.left;
            }
            
            // Calculate visual top of text (where characters actually start)
            // Most text sits at the vertical center of its container
            const visualTextTop = rect.top + ((rect.height - fontSize) / 2);
            adjustedY = visualTextTop;
            textBaseline = visualTextTop + (fontSize * 0.8); // Baseline is typically 80% down from top
            
            // Set precise width with NO padding for exact text bounds
            adjustedWidth = textWidth; // Exact text width, no padding
            
            // Ensure X position is centered if needed
            if (selector === '.user-name') {
              // For centered text, ensure collision box is centered
              const containerCenter = rect.left + (rect.width / 2);
              adjustedX = containerCenter - (adjustedWidth / 2);
            }
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
            element: element,
            textBaseline: textBaseline,
            isText: selector === '.user-name' || selector === '.user-email' || selector === '.user-created' || selector === '.auth-page header h1'
          });
        }
      });
    });
    
    return elements;
  };

  // Handle click to pick up and show GIF
  const handleClick = () => {
    // Show the GIF modal
    setShowGif(true);
    
    if (!isPickedUp) {
      setIsPickedUp(true);
      setBounceCount(prev => prev + 1);
      setShowSparkles(true);
      
      // Play a cute sound effect (if supported)
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors if audio fails
      } catch (e) {
        // Audio not supported, continue silently
      }

      // Hide sparkles after animation
      setTimeout(() => setShowSparkles(false), 1000);
      
      // Drop the mascot after 2 seconds
      setTimeout(() => {
        setIsPickedUp(false);
        setPosition({
          x: Math.random() * (window.innerWidth - 100),
          y: GROUND_Y
        });
        setVelocity({ x: 0, y: 0 });
        setJumpsUsed(0);
        setIsOnWall(false);
        setWallSide(null);
      }, 2000);
    }
  };

  // Handle closing the GIF modal
  const handleCloseGif = () => {
    setShowGif(false);
  };

  // Handle drag start
  const handleMouseDown = (e) => {
    if (isPickedUp) return;
    
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  // Handle drag move
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
    setVelocity({ x: 0, y: 0 });
    setJumpsUsed(0);
    setIsOnWall(false);
    setWallSide(null);
  };

  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false);
  };

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
  }, [isDragging, dragOffset]);

  // Update UI elements regularly
  useEffect(() => {
    const updateUIElements = () => {
      setUiElements(detectUIElements());
    };
    
    // Initial detection
    updateUIElements();
    
    // Update on resize
    window.addEventListener('resize', updateUIElements);
    
    // Update periodically to catch dynamic changes
    const interval = setInterval(updateUIElements, 1000);
    
    return () => {
      window.removeEventListener('resize', updateUIElements);
      clearInterval(interval);
    };
  }, []);

  // Cycle through mascots every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPickedUp) {
        setCurrentMascot(prev => (prev + 1) % mascots.length);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isPickedUp, mascots.length]);

  // Physics loop for gravity, movement, and jumping
  useEffect(() => {
    if (isPickedUp || isDragging) return;
    let animationFrame;
    const step = () => {
      setPosition(prev => {
        let { x, y } = prev;
        let vx = 0;
        let vy = velocity.y;
        
        // Horizontal movement
        if (keys.current.left) vx = -MOVE_SPEED;
        if (keys.current.right) vx = MOVE_SPEED;
        x += vx;
        
        // Wall collision detection
        const hitLeftWall = x <= 0;
        const hitRightWall = x >= window.innerWidth - 80;
        
        if (hitLeftWall) {
          x = 0;
          if (vy > 0 && keys.current.jump) { // Falling and holding space
            setIsOnWall(true);
            setWallSide('left');
            vy = Math.min(vy, WALL_STICK_FORCE); // Slow fall
          } else {
            setIsOnWall(false);
            setWallSide(null);
          }
        } else if (hitRightWall) {
          x = window.innerWidth - 80;
          if (vy > 0 && keys.current.jump) { // Falling and holding space
            setIsOnWall(true);
            setWallSide('right');
            vy = Math.min(vy, WALL_STICK_FORCE); // Slow fall
          } else {
            setIsOnWall(false);
            setWallSide(null);
          }
        } else {
          setIsOnWall(false);
          setWallSide(null);
        }
        
        // Gravity (reduced when sticking to wall)
        if (isOnWall && keys.current.jump) {
          vy += GRAVITY * 0.3; // Reduced gravity when wall sticking
        } else {
          vy += GRAVITY;
        }
        y += vy;
        
        // UI Element Collision Detection
        let landedOnUI = false;
        let currentElement = null;
        
        for (const uiElement of uiElements) {
          const raccoonRight = x + 80;
          const raccoonBottom = y + 80;
          
          // Check if raccoon is landing on top of UI element
          if (
            raccoonRight > uiElement.x && 
            x < uiElement.right &&
            raccoonBottom > uiElement.y &&
            y < uiElement.bottom &&
            vy > 0 // Falling down
          ) {
            // Landing on top of UI element
            if (y < uiElement.y - 20) { // Coming from above
              // For text elements, position raccoon directly on visual text top
              if (uiElement.isText) {
                // Position raccoon so its feet touch the top of the text
                y = uiElement.y - 80; // Raccoon is 80px tall, so bottom touches text top
              } else {
                y = uiElement.y - 80; // Standard offset for non-text elements
              }
              
              vy = 0;
              setJumpsUsed(0);
              setIsOnWall(false);
              setWallSide(null);
              setIsOnUIElement(true);
              setCurrentUIElement(uiElement);
              
              // Only set new random emoji if just landed (state transition)
              if (!wasOnUIElement.current) {
                setCurrentRaccoonEmoji(getRandomRaccoonEmoji());
              }
              
              landedOnUI = true;
              
              // Add glow effect - use text-shadow for text elements
              if (uiElement.element) {
                if (uiElement.isText) {
                  uiElement.element.style.textShadow = '0 0 15px rgba(108, 59, 170, 0.8)';
                  uiElement.element.style.transition = 'text-shadow 0.3s ease';
                } else {
                  uiElement.element.style.boxShadow = '0 0 20px rgba(108, 59, 170, 0.6)';
                  uiElement.element.style.transition = 'box-shadow 0.3s ease';
                }
              }
              
              currentElement = uiElement;
              break;
            } else {
              // Side collision - bounce off
              if (vx > 0) { // Moving right
                x = uiElement.x - 80;
                vx = 0;
              } else if (vx < 0) { // Moving left
                x = uiElement.right;
                vx = 0;
              }
            }
          }
        }
        
        // Clear glow effect from previous UI element
        if (!landedOnUI && currentUIElement && currentUIElement.element) {
          if (currentUIElement.isText) {
            currentUIElement.element.style.textShadow = '';
          } else {
            currentUIElement.element.style.boxShadow = '';
          }
          setIsOnUIElement(false);
          setCurrentUIElement(null);
        }
        
        // Ground collision (only if not on UI element)
        if (!landedOnUI && y >= GROUND_Y) {
          y = GROUND_Y;
          vy = 0;
          setJumpsUsed(0);
          setIsOnWall(false);
          setWallSide(null);
          setIsOnUIElement(false);
          setCurrentUIElement(null);
        }
        
        // Jumping logic (works from ground or UI elements)
        if ((y >= GROUND_Y || landedOnUI) && !charging) {
          if (charge > 0) {
            vy = -JUMP_FORCE * (1 + charge);
            setCharge(0);
          } else if (keys.current.jump && jumpsUsed < MAX_JUMPS && !charging) {
            vy = -JUMP_FORCE;
            setJumpsUsed(1);
          }
        } else if (!landedOnUI && y < GROUND_Y) {
          // Air jumps (double and triple jump)
          if (keys.current.jump && jumpsUsed === 1 && vy > 0) {
            vy = -JUMP_FORCE * 0.8; // Slightly weaker double jump
            setJumpsUsed(2);
          } else if (keys.current.jump && jumpsUsed === 2 && vy > 0) {
            vy = -JUMP_FORCE * 0.6; // Even weaker triple jump
            setJumpsUsed(3);
          }
        }
        
        // Keep in bounds
        x = Math.max(0, Math.min(x, window.innerWidth - 80));
        y = Math.min(y, GROUND_Y);
        
        setVelocity({ x: vx, y: vy });
        
        // Update previous state for next frame
        wasOnUIElement.current = landedOnUI;
        
        return { x, y };
      });
      animationFrame = requestAnimationFrame(step);
    };
    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPickedUp, isDragging, velocity.y, jumpsUsed, isOnWall, charging, charge]);

  // Keep mascot within viewport bounds on resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.max(0, Math.min(prev.x, window.innerWidth - 80)),
        y: Math.min(prev.y, window.innerHeight - 80, GROUND_Y)
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isPickedUp) return;
      if (e.key === ' ' || e.key === 'Spacebar') {
        if (position.y === GROUND_Y && !charging) {
          setCharging(true);
        }
        keys.current.jump = true;
      } else if (e.key === 'ArrowLeft') {
        keys.current.left = true;
      } else if (e.key === 'ArrowRight') {
        keys.current.right = true;
      }
    };
    const handleKeyUp = (e) => {
      if (e.key === ' ' || e.key === 'Spacebar') {
        if (charging) {
          setCharging(false);
        }
        keys.current.jump = false;
      } else if (e.key === 'ArrowLeft') {
        keys.current.left = false;
      } else if (e.key === 'ArrowRight') {
        keys.current.right = false;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPickedUp, charging, position.y]);

  useEffect(() => {
    let chargeInterval;
    if (charging && charge < CHARGE_MAX) {
      chargeInterval = setInterval(() => {
        setCharge(c => Math.min(CHARGE_MAX, c + CHARGE_RATE));
      }, 16);
    }
    return () => clearInterval(chargeInterval);
  }, [charging, charge]);

  const raccoonMascotStyles = `
    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: scale(1.2) rotate(5deg) translateY(0); }
      40% { transform: scale(1.3) rotate(10deg) translateY(-10px); }
      60% { transform: scale(1.25) rotate(7deg) translateY(-5px); }
    }
    @keyframes idle {
      0%, 100% { transform: scale(1) translateY(0px); }
      50% { transform: scale(1.05) translateY(-3px); }
    }
    @keyframes sitting {
      0%, 100% { transform: scale(1.05) translateY(0px) rotate(0deg); }
      33% { transform: scale(1.06) translateY(-1px) rotate(1deg); }
      66% { transform: scale(1.04) translateY(1px) rotate(-1deg); }
    }
    @keyframes sparkle {
      0% { opacity: 0; transform: scale(0); }
      50% { opacity: 1; transform: scale(1.2); }
      100% { opacity: 0; transform: scale(1.5); }
    }
  `;

  return (
    <>
      <style>{raccoonMascotStyles}</style>
      <div
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 1000,
          cursor: isPickedUp ? 'grabbing' : 'grab',
          userSelect: 'none',
          pointerEvents: 'auto',
        }}
      >
        {/* Sparkles effect */}
        {showSparkles && (
          <div style={{
            position: 'absolute',
            top: -20,
            left: -20,
            right: -20,
            bottom: -20,
            pointerEvents: 'none',
            animation: 'sparkle 1s ease-out',
          }}>
            <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', fontSize: '20px' }}>✨</span>
            <span style={{ position: 'absolute', top: '20%', left: '20%', fontSize: '16px', animationDelay: '0.2s' }}>⭐</span>
            <span style={{ position: 'absolute', top: '30%', right: '20%', fontSize: '18px', animationDelay: '0.4s' }}>💫</span>
            <span style={{ position: 'absolute', bottom: '20%', left: '30%', fontSize: '14px', animationDelay: '0.6s' }}>✨</span>
            <span style={{ position: 'absolute', bottom: '10%', right: '30%', fontSize: '16px', animationDelay: '0.8s' }}>⭐</span>
          </div>
        )}

        {/* Wall stick indicator */}
        {isOnWall && (
          <div style={{
            position: 'absolute',
            top: -15,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '12px',
            color: '#ff6b6b',
            fontWeight: 'bold',
            background: 'rgba(255,255,255,0.9)',
            padding: '2px 6px',
            borderRadius: '8px',
            border: '1px solid #ff6b6b',
          }}>
            🧲
          </div>
        )}

        {/* UI Element sitting indicator */}
        {isOnUIElement && (
          <div style={{
            position: 'absolute',
            top: -15,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '14px',
            color: '#6c3baa',
            fontWeight: 'bold',
            background: 'rgba(255,255,255,0.9)',
            padding: '2px 6px',
            borderRadius: '8px',
            border: '1px solid #6c3baa',
          }}>
            {currentRaccoonEmoji}
          </div>
        )}

        {/* Mascot image */}
        <div
          ref={mascotRef}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          style={{
            width: '80px',
            height: '80px',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: isPickedUp ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
            transform: isPickedUp 
              ? 'scale(1.2) rotate(5deg)' 
              : isOnUIElement 
                ? 'scale(1) translateY(0px)' // Remove scale to prevent floating effect
                : `scale(1) ${bounceCount % 2 === 0 ? 'translateY(0px)' : 'translateY(-2px)'}`,
            transition: isPickedUp 
              ? 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)' 
              : 'all 0.2s ease-in-out',
            animation: isPickedUp 
              ? 'bounce 0.5s ease-in-out' 
              : isOnUIElement 
                ? 'sitting 3s ease-in-out infinite' // Special sitting animation
                : 'idle 2s ease-in-out infinite',
            boxShadow: isPickedUp 
              ? '0 8px 25px rgba(0,0,0,0.2)' 
              : '0 4px 15px rgba(0,0,0,0.1)',
            cursor: isPickedUp ? 'grabbing' : 'grab',
          }}
          title={isPickedUp ? "I'm being held! 🦝💕" : "Click to pick up, use ← → to run, space to jump (triple jump available)!"}
        >
          <img src="/racoon.png" alt="Racoon Mascot" style={{ width: '80px', height: '80px', pointerEvents: 'none', userSelect: 'none' }} draggable={false} />
        </div>

        {/* Bounce counter */}
        {bounceCount > 0 && (
          <div style={{
            position: 'absolute',
            top: -30,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '12px',
            color: '#666',
            fontWeight: 'bold',
            background: 'rgba(255,255,255,0.8)',
            padding: '2px 6px',
            borderRadius: '10px',
            border: '1px solid rgba(0,0,0,0.1)',
            backdropFilter: 'blur(5px)',
          }}>
            {bounceCount}
          </div>
        )}

        {/* Jump counter */}
        {jumpsUsed > 0 && (
          <div style={{
            position: 'absolute',
            top: isOnWall ? -45 : -30,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '12px',
            color: '#6c3baa',
            fontWeight: 'bold',
            background: 'rgba(255,255,255,0.9)',
            padding: '2px 6px',
            borderRadius: '10px',
            border: '1px solid #6c3baa',
            backdropFilter: 'blur(5px)',
          }}>
            {jumpsUsed}
          </div>
        )}

        {/* Charge bar */}
        {charging && (
          <div style={{
            position: 'absolute',
            left: '50%',
            bottom: -18,
            transform: 'translateX(-50%)',
            width: 60,
            height: 8,
            background: '#f5f5f5',
            borderRadius: 4,
            border: '1px solid #b3b3b3',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${(charge / CHARGE_MAX) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #b2a5c1, #6c3baa)',
              transition: 'width 0.1s',
            }} />
          </div>
        )}

        {/* GIF Modal */}
        {showGif && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2000,
              cursor: 'pointer',
            }}
            onClick={handleCloseGif}
          >
            <div
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                borderRadius: '15px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src="/racoon_celebration.gif"
                alt="Raccoon GIF"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
              <button
                onClick={handleCloseGif}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 0, 0, 0.8)';
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(0, 0, 0, 0.7)';
                  e.target.style.transform = 'scale(1)';
                }}
                title="Close GIF"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}