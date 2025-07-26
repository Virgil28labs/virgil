import { useEffect, useCallback, useRef } from 'react';

export interface Shortcut {
  /** Key to listen for */
  key: string
  /** Required modifier keys */
  modifiers?: ('ctrl' | 'cmd' | 'alt' | 'shift')[]
  /** Handler function */
  handler: () => void
  /** Whether to prevent default behavior */
  preventDefault?: boolean
  /** Description for documentation */
  description?: string
  /** Scope for the shortcut */
  scope?: 'global' | 'input' | 'modal'
}

interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean
  /** Element to attach listeners to */
  target?: HTMLElement | null
  /** Default scope for all shortcuts */
  defaultScope?: 'global' | 'input' | 'modal'
}

/**
 * Hook for managing keyboard shortcuts
 * Handles cross-platform modifier keys and prevents conflicts
 */
export function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  options: UseKeyboardShortcutsOptions = {},
) {
  const { enabled = true, target, defaultScope = 'global' } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when they change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const target = event.target as HTMLElement;
    const isInputElement = target.tagName === 'INPUT' ||
                          target.tagName === 'TEXTAREA' ||
                          target.contentEditable === 'true';

    for (const shortcut of shortcutsRef.current) {
      // Check scope
      const scope = shortcut.scope || defaultScope;
      if (scope === 'input' && !isInputElement) continue;
      if (scope === 'modal' && !target.closest('[role="dialog"]')) continue;

      // Check if key matches
      if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;

      // Check modifiers
      const modifiers = shortcut.modifiers || [];
      const hasCtrl = modifiers.includes('ctrl');
      const hasCmd = modifiers.includes('cmd');
      const hasAlt = modifiers.includes('alt');
      const hasShift = modifiers.includes('shift');

      // Handle cmd/ctrl based on platform
      const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      const modifiersMatch =
        (!hasCtrl && !hasCmd || (hasCtrl && event.ctrlKey) || (hasCmd && event.metaKey) || ((hasCtrl || hasCmd) && ctrlOrCmd)) &&
        (!hasAlt || event.altKey) &&
        (!hasShift || event.shiftKey) &&
        // Ensure no extra modifiers are pressed
        (hasCtrl || hasCmd || !ctrlOrCmd) &&
        (hasAlt || !event.altKey) &&
        (hasShift || !event.shiftKey);

      if (modifiersMatch) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.handler();
        break;
      }
    }
  }, [enabled, defaultScope]);

  useEffect(() => {
    const targetElement = target || document;

    targetElement.addEventListener('keydown', handleKeyDown as EventListener);
    return () => targetElement.removeEventListener('keydown', handleKeyDown as EventListener);
  }, [handleKeyDown, target]);

  // Return shortcut info for display
  return {
    shortcuts: shortcuts.map(s => ({
      key: s.key,
      modifiers: s.modifiers || [],
      description: s.description || '',
    })),
  };
}

/**
 * Format keyboard shortcut for display
 * Handles platform-specific modifier keys
 */
export function formatShortcut(
  key: string,
  modifiers?: ('ctrl' | 'cmd' | 'alt' | 'shift')[],
): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const parts: string[] = [];

  if (modifiers) {
    if (modifiers.includes('ctrl') || modifiers.includes('cmd')) {
      parts.push(isMac ? '⌘' : 'Ctrl');
    }
    if (modifiers.includes('alt')) {
      parts.push(isMac ? '⌥' : 'Alt');
    }
    if (modifiers.includes('shift')) {
      parts.push(isMac ? '⇧' : 'Shift');
    }
  }

  // Format special keys
  const formattedKey = key.length === 1
    ? key.toUpperCase()
    : key.charAt(0).toUpperCase() + key.slice(1);

  parts.push(formattedKey);

  return parts.join(isMac ? '' : '+');
}

/**
 * Common shortcut patterns
 */
export const COMMON_SHORTCUTS = {
  SAVE: { key: 's', modifiers: ['cmd', 'ctrl'] as const },
  SEARCH: { key: 'k', modifiers: ['cmd', 'ctrl'] as const },
  NEW: { key: 'n', modifiers: ['cmd', 'ctrl'] as const },
  CLOSE: { key: 'Escape', modifiers: [] as const },
  SUBMIT: { key: 'Enter', modifiers: ['cmd', 'ctrl'] as const },
  SETTINGS: { key: ',', modifiers: ['cmd', 'ctrl'] as const },
} as const;
