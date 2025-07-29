/**
 * Styles and animations for the RaccoonMascot component
 */

export const RACCOON_ANIMATIONS = `
  @keyframes bounce {
    0%, 20%, 50%, 80%, 100% { transform: scale(1.2) rotate(5deg) translateY(0); }
    40% { transform: scale(1.3) rotate(10deg) translateY(-10px); }
    60% { transform: scale(1.25) rotate(7deg) translateY(-5px); }
  }
  @keyframes dustFade {
    0% { 
      opacity: 0.6; 
      transform: translateY(0) scale(1);
    }
    100% { 
      opacity: 0; 
      transform: translateY(10px) scale(0.5);
    }
  }
  @keyframes pulseGlow {
    0%, 100% { 
      box-shadow: 0 0 20px rgba(108, 59, 170, 0.4), 0 0 40px rgba(108, 59, 170, 0.2);
    }
    50% { 
      box-shadow: 0 0 30px rgba(108, 59, 170, 0.6), 0 0 60px rgba(108, 59, 170, 0.3);
    }
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
  @keyframes running {
    0%, 100% { transform: scale(1.02) translateY(0px) rotate(0deg); }
    25% { transform: scale(1.04) translateY(-1px) rotate(1deg); }
    50% { transform: scale(1.02) translateY(-2px) rotate(0deg); }
    75% { transform: scale(1.04) translateY(-1px) rotate(-1deg); }
  }
  @keyframes sparkle {
    0% { opacity: 0; transform: scale(0); }
    50% { opacity: 1; transform: scale(1.2); }
    100% { opacity: 0; transform: scale(1.5); }
  }
  @keyframes sleeping-breath {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }
  @keyframes floating-zzz {
    0% {
      opacity: 0;
      transform: translateY(0px) scale(0.8);
    }
    20% {
      opacity: 1;
      transform: translateY(-10px) scale(1);
    }
    100% {
      opacity: 0;
      transform: translateY(-40px) scale(0.6);
    }
  }
`;

// Static styles
export const styles = {
  mainContainer: (isPickedUp: boolean) => ({
    position: 'fixed' as const,
    zIndex: 1000,
    cursor: isPickedUp ? 'grabbing' : 'grab',
    userSelect: 'none' as const,
    pointerEvents: 'auto' as const,
  }),
  
  sparklePosition: (pos: { top?: string | number; bottom?: string | number; left?: string | number; right?: string | number; size: number; delay: number }) => ({
    position: 'absolute' as const,
    top: pos.top,
    bottom: pos.bottom,
    left: pos.left,
    right: pos.right,
    fontSize: `${pos.size}px`,
    animationDelay: `${pos.delay}s`,
  }),
  
  trailImage: (facingDirection: 'left' | 'right') => ({
    width: '80px',
    height: '80px',
    transform: facingDirection === 'left' ? 'scaleX(1)' : 'scaleX(-1)',
    filter: 'blur(1px)',
  }),
  
  sparkleContainer: {
    position: 'absolute' as const,
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    pointerEvents: 'none' as const,
    animation: 'sparkle 1s ease-out',
  },
  
  dustParticle: {
    position: 'absolute' as const,
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'rgba(139, 123, 161, 0.6)',
    pointerEvents: 'none' as const,
    animation: 'dustFade 0.5s ease-out forwards',
  },
  
  sleepEmoji: {
    position: 'absolute' as const,
    top: -10,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '20px',
    pointerEvents: 'none' as const,
    animation: 'floating-zzz 3s ease-out infinite',
  },
  
  indicator: {
    position: 'absolute' as const,
    top: -15,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '12px',
    fontWeight: 'bold',
    background: 'rgba(255,255,255,0.9)',
    padding: '2px 6px',
    borderRadius: '8px',
    backdropFilter: 'blur(5px)',
  },
  
  wallIndicator: {
    color: '#ff6b6b',
    border: '1px solid #ff6b6b',
  },
  
  uiIndicator: {
    fontSize: '14px',
    color: '#6c3baa',
    border: '1px solid #6c3baa',
  },
  
  counter: {
    position: 'absolute' as const,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '12px',
    fontWeight: 'bold',
    background: 'rgba(255,255,255,0.9)',
    padding: '2px 6px',
    borderRadius: '10px',
    backdropFilter: 'blur(5px)',
  },
  
  bounceCounter: {
    top: -30,
    color: '#666',
    background: 'rgba(255,255,255,0.8)',
    border: '1px solid rgba(0,0,0,0.1)',
  },
  
  jumpCounter: {
    color: '#6c3baa',
    border: '1px solid #6c3baa',
  },
  
  chargeBar: {
    position: 'absolute' as const,
    left: '50%',
    bottom: -20,
    transform: 'translateX(-50%)',
    width: 70,
    height: 10,
    background: 'var(--brand-light-gray)',
    borderRadius: 5,
    border: '1px solid var(--brand-medium-gray)',
    overflow: 'hidden',
  },
  
  chargeFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--brand-light-purple), var(--brand-accent-purple))',
    transition: 'width 0.1s',
  },
  
  gifModal: {
    position: 'fixed' as const,
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
  },
  
  gifContainer: {
    maxWidth: '90vw',
    maxHeight: '90vh',
    borderRadius: '15px',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
    position: 'relative' as const,
  },
  
  gifImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
    display: 'block',
  },
  
  gifCloseButton: {
    position: 'absolute' as const,
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
  },
};

// Dynamic style functions
export const getDynamicShadow = (groundY: number, positionY: number) => ({
  position: 'absolute' as const,
  bottom: -10,
  left: '50%',
  transform: 'translateX(-50%)',
  width: `${80 - (groundY - positionY) / 10}px`,
  height: '20px',
  background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)',
  opacity: Math.max(0.1, 1 - (groundY - positionY) / 200),
  filter: `blur(${Math.min(10, (groundY - positionY) / 20)}px)`,
  pointerEvents: 'none' as const,
  transition: 'all 0.1s ease-out',
});

export const getTrailStyle = (x: number, y: number, opacity: number, index: number) => ({
  position: 'fixed' as const,
  left: x,
  top: y,
  width: '80px',
  height: '80px',
  opacity: opacity,
  pointerEvents: 'none' as const,
  zIndex: 999 - index,
});

export const getChargeGlow = (charge: number) => 
  `0 0 ${20 + charge * 20}px rgba(108, 59, 170, ${0.4 + charge * 0.3}), 0 0 ${40 + charge * 30}px rgba(108, 59, 170, ${0.2 + charge * 0.2})`;

export const getMascotContainerStyle = (
  isPickedUp: boolean,
  velocity: { x: number; y: number },
  isSquashing: boolean,
  isOnUIElement: boolean,
  visualState: { bounceCount: number },
  charging: boolean,
  charge: number,
  isSleeping: boolean,
  isRunning: boolean,
) => ({
  width: '80px',
  height: '80px',
  background: 'transparent',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  filter: isPickedUp
    ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.3))'
    : velocity.x !== 0 || velocity.y !== 0
      ? `drop-shadow(0 4px 8px rgba(0,0,0,0.2)) blur(${Math.min(2, Math.abs(velocity.x) / 10)}px)`
      : 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))',
  transform: isPickedUp
    ? 'scale(1.2) rotate(5deg)'
    : isSquashing
      ? 'scale(1.3, 0.7) translateY(10px)'
      : isOnUIElement
        ? 'scale(1) translateY(0px)'
        : velocity.x !== 0
          ? `scale(1) translateY(0px) rotate(${velocity.x > 0 ? 3 : -3}deg)`
          : `scale(1) ${visualState.bounceCount % 2 === 0 ? 'translateY(0px)' : 'translateY(-2px)'}`,
  transition: isPickedUp
    ? 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    : isSquashing
      ? 'transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)'
      : 'all 0.1s ease-out',
  animation: isPickedUp
    ? 'bounce 0.5s ease-in-out'
    : charging
      ? 'pulseGlow 1s ease-in-out infinite'
      : isSleeping
        ? 'sleeping-breath 3s ease-in-out infinite'
        : isOnUIElement
          ? 'sitting 3s ease-in-out infinite'
          : isRunning
            ? 'running 0.3s ease-in-out infinite'
            : 'idle 2s ease-in-out infinite',
  boxShadow: isPickedUp
    ? '0 8px 25px rgba(0,0,0,0.2)'
    : charging
      ? getChargeGlow(charge)
      : '0 4px 15px rgba(0,0,0,0.1)',
  cursor: isPickedUp ? 'grabbing' : 'grab',
});

export const getRaccoonImageStyle = (facingDirection: 'left' | 'right') => ({
  width: '80px',
  height: '80px',
  pointerEvents: 'none' as const,
  userSelect: 'none' as const,
  transform: facingDirection === 'left' ? 'scaleX(1)' : 'scaleX(-1)',
  transition: 'transform 0.1s ease-in-out',
});