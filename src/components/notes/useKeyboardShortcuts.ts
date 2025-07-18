import { useEffect } from 'react'

interface UseKeyboardShortcutsProps {
  onOpenNotes: () => void
  onCloseNotes: () => void
  onFocusInput: () => void
  isOpen: boolean
}

export const useKeyboardShortcuts = ({
  onOpenNotes,
  onCloseNotes,
  onFocusInput,
  isOpen
}: UseKeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + N - Open notes
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') {
        e.preventDefault()
        if (!isOpen) {
          onOpenNotes()
        }
      }

      // Escape - Close notes (if open)
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        onCloseNotes()
      }

      // Cmd/Ctrl + K - Focus input (if notes are open)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && isOpen) {
        e.preventDefault()
        onFocusInput()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onOpenNotes, onCloseNotes, onFocusInput])
}