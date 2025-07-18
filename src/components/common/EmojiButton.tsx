import React, { useState, Suspense, type FC } from 'react';
import { cn } from '@/lib/utils';

interface EmojiButtonProps {
  emoji: string;
  ariaLabel: string;
  GalleryComponent: React.ComponentType<{ onClose: () => void }>;
  position?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  hoverScale?: number;
  className?: string;
  hoverColor?: {
    background: string;
    border: string;
    glow: string;
  };
  title?: string;
}

const defaultHoverColor = {
  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(167, 139, 250, 0.3) 100%)',
  border: 'rgba(139, 92, 246, 0.6)',
  glow: 'rgba(139, 92, 246, 0.4)'
};

export const EmojiButton: FC<EmojiButtonProps> = ({
  emoji,
  ariaLabel,
  GalleryComponent,
  position = { bottom: '20px', left: '20px' },
  hoverScale = 1.15,
  className,
  hoverColor = defaultHoverColor,
  title,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const positionStyles = {
    position: 'fixed' as const,
    ...position,
  };

  const buttonStyles: React.CSSProperties = {
    ...positionStyles,
    fontSize: '1.2rem',
    background: isHovered ? hoverColor.background : 'none',
    border: isHovered ? `2px solid ${hoverColor.border}` : '2px solid transparent',
    borderRadius: '50%',
    width: '2.5rem',
    height: '2.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 1000,
    opacity: isHovered ? 1 : 0.8,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    filter: isHovered 
      ? `drop-shadow(0 8px 25px ${hoverColor.glow})` 
      : 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
    transform: isHovered 
      ? `scale(${hoverScale}) rotate(-5deg) translateY(-3px)` 
      : 'scale(1) rotate(0deg)',
    backdropFilter: isHovered ? 'blur(20px)' : 'none',
    boxShadow: isHovered 
      ? `0 0 30px ${hoverColor.glow.replace('0.4', '0.3')}, inset 0 1px 0 rgba(255, 255, 255, 0.2)` 
      : 'none'
  };

  const emojiStyles: React.CSSProperties = {
    background: isHovered 
      ? `linear-gradient(45deg, ${hoverColor.border}, ${hoverColor.border.replace('0.6', '0.8')})` 
      : 'transparent',
    WebkitBackgroundClip: isHovered ? 'text' : undefined,
    WebkitTextFillColor: isHovered ? 'transparent' : 'inherit',
    transition: 'all 0.3s ease',
    transform: isHovered ? 'scale(1.1)' : 'scale(1)',
    display: 'inline-block'
  };

  return (
    <>
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'touch-manipulation select-none',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          className
        )}
        style={buttonStyles}
        aria-label={ariaLabel}
        title={title}
      >
        <span style={emojiStyles}>
          {emoji}
        </span>
      </button>

      {isOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
            <div className="flex flex-col items-center gap-4 text-white">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/30 border-t-white" />
              <span>Loading...</span>
            </div>
          </div>
        }>
          <GalleryComponent onClose={handleClose} />
        </Suspense>
      )}
    </>
  );
};