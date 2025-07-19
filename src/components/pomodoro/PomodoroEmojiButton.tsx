import { EmojiButton } from '../common/EmojiButton'
import { PomodoroApp } from './PomodoroApp'

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
      background: 'linear-gradient(135deg, rgba(239, 176, 194, 0.3) 0%, rgba(178, 165, 193, 0.3) 100%)',
      border: 'rgba(239, 176, 194, 0.6)',
      glow: 'rgba(239, 176, 194, 0.4)'
    }}
    title="Pomodoro Timer"
    className="opacity-80 hover:opacity-100"
  />
)