import { lazy } from 'react'
import { EmojiButton } from '../common/EmojiButton'

const PomodoroApp = lazy(() => 
  import('./PomodoroApp').then(module => ({ 
    default: module.PomodoroApp 
  }))
)

const PomodoroAppWrapper = ({ onClose }: { onClose: () => void }) => (
  <PomodoroApp isOpen={true} onClose={onClose} />
)

export const PomodoroEmojiButton = () => (
  <EmojiButton
    emoji="🍅"
    ariaLabel="Open Pomodoro Timer"
    GalleryComponent={PomodoroAppWrapper}
    position={{ top: '9.5rem', left: '1.9rem' }}
    hoverScale={1.15}
    hoverColor={{
      background: 'linear-gradient(135deg, rgba(239, 176, 194, 0.3) 0%, rgba(108, 59, 170, 0.3) 100%)',
      border: 'rgba(108, 59, 170, 0.6)',
      glow: 'rgba(239, 176, 194, 0.4)'
    }}
    title="Pomodoro Timer - Focus with the power of tomatoes!"
    className="opacity-80 hover:opacity-100"
  />
)