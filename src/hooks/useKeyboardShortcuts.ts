import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  scope?: 'global' | 'input' | 'modal';
}

/**
 * Hook for managing keyboard shortcuts with accessibility support
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  scope = 'global',
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Check if we should ignore the shortcut based on scope
    const target = event.target as HTMLElement;
    const isInputElement = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true';

    if (scope === 'input' && !isInputElement) return;
    if (scope === 'modal' && !target.closest('[role="dialog"]')) return;

    // Find matching shortcut
    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey;
      const shiftMatch = !!shortcut.shiftKey === event.shiftKey;
      const altMatch = !!shortcut.altKey === event.altKey;
      const metaMatch = !!shortcut.metaKey === event.metaKey;

      return keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch;
    });

    if (matchingShortcut) {
      if (matchingShortcut.preventDefault !== false) {
        event.preventDefault();
      }
      matchingShortcut.action();
    }
  }, [shortcuts, enabled, scope]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  return shortcuts;
}

// Predefined shortcuts for the chat application
export const CHAT_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'Enter',
    ctrlKey: true,
    action: () => {
      // Send message (will be overridden by specific implementations)
    },
    description: 'Send message',
  },
  {
    key: 'k',
    ctrlKey: true,
    action: () => {
      // Focus search (will be overridden by specific implementations)
    },
    description: 'Focus search',
  },
  {
    key: 'm',
    ctrlKey: true,
    action: () => {
      // Open memory modal (will be overridden by specific implementations)
    },
    description: 'Open memory modal',
  },
  {
    key: 'n',
    ctrlKey: true,
    action: () => {
      // New conversation (will be overridden by specific implementations)
    },
    description: 'Start new conversation',
  },
  {
    key: 'Escape',
    action: () => {
      // Close modal/dropdown (will be overridden by specific implementations)
    },
    description: 'Close modal or dropdown',
  },
  {
    key: '/',
    action: () => {
      // Focus search (will be overridden by specific implementations)
    },
    description: 'Focus search',
    preventDefault: false,
  },
];

export const MEMORY_MODAL_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'Escape',
    action: () => {
      // Close memory modal (will be overridden by specific implementations)
    },
    description: 'Close memory modal',
  },
  {
    key: 'f',
    ctrlKey: true,
    action: () => {
      // Focus search in modal (will be overridden by specific implementations)
    },
    description: 'Focus search',
  },
  {
    key: 'e',
    ctrlKey: true,
    action: () => {
      // Export data (will be overridden by specific implementations)
    },
    description: 'Export all data',
  },
];

export const MESSAGE_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'c',
    altKey: true,
    action: () => {
      // Copy message (will be overridden by specific implementations)
    },
    description: 'Copy message',
  },
  {
    key: 'i',
    altKey: true,
    action: () => {
      // Mark as important (will be overridden by specific implementations)
    },
    description: 'Mark as important',
  },
  {
    key: 's',
    altKey: true,
    action: () => {
      // Share message (will be overridden by specific implementations)
    },
    description: 'Share message',
  },
  {
    key: 'q',
    altKey: true,
    action: () => {
      // Quote message (will be overridden by specific implementations)
    },
    description: 'Quote message',
  },
];