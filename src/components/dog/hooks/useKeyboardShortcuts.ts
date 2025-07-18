import { useEffect } from 'react'

export interface KeyboardShortcuts {
  'Escape'?: () => void
  'ArrowLeft'?: () => void
  'ArrowRight'?: () => void
  'f'?: () => void // Fetch shortcut
  'g'?: () => void // Gallery shortcut
}

export const useKeyboardShortcuts = (
  shortcuts: KeyboardShortcuts,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const handler = shortcuts[e.key as keyof KeyboardShortcuts]
      if (handler) {
        e.preventDefault()
        handler()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts, enabled])
}