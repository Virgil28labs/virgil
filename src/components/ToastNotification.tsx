import { memo, useEffect, useState } from 'react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastNotificationProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

export const ToastNotification = memo(function ToastNotification({ 
  toast, 
  onDismiss 
}: ToastNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const { id, type, title, message, duration = 5000, action } = toast;

  const typeStyles = {
    success: {
      backgroundColor: '#10b981',
      borderColor: '#059669',
      icon: '✓'
    },
    error: {
      backgroundColor: '#ef4444',
      borderColor: '#dc2626',
      icon: '✕'
    },
    warning: {
      backgroundColor: '#f59e0b',
      borderColor: '#d97706',
      icon: '⚠'
    },
    info: {
      backgroundColor: 'var(--brand-accent-purple)',
      borderColor: 'var(--brand-light-purple)',
      icon: 'ℹ'
    }
  };

  const currentStyle = typeStyles[type];

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss(id);
    }, 300);
  };

  return (
    <div
      style={{
        backgroundColor: currentStyle.backgroundColor,
        border: `1px solid ${currentStyle.borderColor}`,
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '8px',
        minWidth: '300px',
        maxWidth: '500px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transform: isVisible && !isLeaving ? 'translateX(0)' : 'translateX(100%)',
        opacity: isVisible && !isLeaving ? 1 : 0,
        transition: 'all 0.3s ease-in-out',
        position: 'relative',
        color: 'white'
      }}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            fontSize: '18px',
            lineHeight: 1,
            marginTop: '2px'
          }}
          aria-hidden="true"
        >
          {currentStyle.icon}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          {title && (
            <div
              style={{
                fontWeight: 600,
                fontSize: '14px',
                marginBottom: '4px'
              }}
            >
              {title}
            </div>
          )}
          <div
            style={{
              fontSize: '14px',
              lineHeight: 1.4
            }}
          >
            {message}
          </div>
          
          {action && (
            <button
              onClick={action.onClick}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '4px',
                color: 'white',
                fontSize: '12px',
                padding: '4px 8px',
                marginTop: '8px',
                cursor: 'pointer',
                fontWeight: 500
              }}
              aria-label={action.label}
            >
              {action.label}
            </button>
          )}
        </div>
        
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.8)',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0',
            lineHeight: 1,
            marginLeft: '8px'
          }}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
      
      {duration > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            animation: `toast-progress ${duration}ms linear forwards`
          }}
        />
      )}
    </div>
  );
});

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const ToastContainer = memo(function ToastContainer({
  toasts,
  onDismiss,
  position = 'top-right'
}: ToastContainerProps) {
  const positionStyles = {
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
    'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
    'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' }
  };

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 9999,
        pointerEvents: 'none'
      }}
      aria-live="polite"
      aria-label="Notifications"
    >
      <div style={{ pointerEvents: 'auto' }}>
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
});

// Add CSS animation for progress bar
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes toast-progress {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }
  `;
  
  if (!document.querySelector('[data-toast-styles]')) {
    style.setAttribute('data-toast-styles', 'true');
    document.head.appendChild(style);
  }
}