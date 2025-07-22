import { memo, useState, useCallback } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  currentEmoji?: string
}

interface EmojiCategory {
  name: string
  emojis: string[]
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Popular',
    emojis: [
      '🔥', '✨', '🎯', '💪', '🧠', '💡', '⭐', '🌟', '✅', '🚀',
      '💯', '🎉', '🏆', '👑', '💎', '🌈', '☀️', '🌸', '🎨', '🎵',
      '📚', '💧', '🧘', '✏️', '🏃', '💊', '☕', '😴', '🥗', '💻',
    ],
  },
  {
    name: 'Health & Fitness',
    emojis: [
      '💪', '🏃', '🚴', '🏊', '🧘', '⛹️', '🤸', '🥊', '🏋️', '⚽',
      '🏀', '🎾', '🏐', '🥗', '🍎', '🥤', '💊', '😴', '🩺', '❤️',
      '🦷', '🧖', '💧', '🥦', '🏌️', '🤺', '🏈', '⛷️', '🏂', '🧗',
    ],
  },
  {
    name: 'Work & Study',
    emojis: [
      '💻', '📚', '✏️', '📝', '📖', '🎓', '💼', '📊', '📈', '💰',
      '🖊️', '📐', '🔬', '🔭', '🎯', '📌', '📎', '🗂️', '📅', '⏰',
      '🖥️', '⌨️', '🖱️', '💾', '📱', '☎️', '📞', '📠', '🏢', '🏦',
    ],
  },
  {
    name: 'Personal',
    emojis: [
      '🧹', '🍳', '🌱', '🎨', '🎵', '🎸', '📷', '✈️', '🏡', '🚗',
      '🛁', '👕', '🧺', '💰', '🎮', '📱', '🔧', '🎭', '🎬', '🎪',
      '🛏️', '🚿', '🪒', '🧴', '🧽', '🧣', '👔', '👗', '🎹', '🎤',
    ],
  },
  {
    name: 'Mindfulness',
    emojis: [
      '🧘', '🙏', '☮️', '🕉️', '☯️', '⚡', '🌌', '🌠', '💫', '🔮',
      '🧿', '🎴', '🃏', '🎰', '🎲', '🧩', '🎯', '🎪', '🎭', '🎨',
      '📿', '🛐', '⛩️', '🕯️', '🔔', '📯', '🥁', '🪘', '🎺', '🎻',
    ],
  },
  {
    name: 'Nature',
    emojis: [
      '☀️', '🌙', '⭐', '⛅', '☁️', '🌧️', '⛈️', '❄️', '🌈', '🌊',
      '🌸', '🌺', '🌻', '🌹', '🌿', '🌱', '🌳', '🍂', '🦋', '🐝',
      '🌴', '🌵', '🌾', '🌷', '🌼', '🍀', '🍄', '🐚', '🦜', '🦢',
    ],
  },
  {
    name: 'Food & Drink',
    emojis: [
      '☕', '🍵', '🥤', '🍺', '🍷', '🥗', '🍕', '🍔', '🍱', '🍜',
      '🍎', '🍊', '🍓', '🥑', '🥦', '🍞', '🧁', '🍰', '🍫', '🍿',
      '🥛', '🧃', '🧉', '🍹', '🍸', '🥃', '🍴', '🥄', '🔪', '🍽️',
    ],
  },
  {
    name: 'Social',
    emojis: [
      '👥', '💬', '📱', '❤️', '💕', '😊', '🤝', '👪', '👫', '👬',
      '👭', '💏', '💑', '🗣️', '👂', '👁️', '🫂', '🤗', '😇', '🥰',
      '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛',
    ],
  },
];

export const EmojiPicker = memo(function EmojiPicker({
  onSelect,
  onClose,
  currentEmoji,
}: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);

  const handleEmojiClick = useCallback((emoji: string) => {
    onSelect(emoji);
    onClose();
  }, [onSelect, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  return (
    <div className="emoji-picker-backdrop" onClick={handleBackdropClick}>
      <div className="emoji-picker-panel">
        <div className="emoji-picker-header">
          <h3>Choose an emoji</h3>
          <button
            className="emoji-picker-close"
            onClick={onClose}
            aria-label="Close emoji picker"
          >
            ×
          </button>
        </div>

        <div className="emoji-picker-categories">
          {EMOJI_CATEGORIES.map((category, index) => (
            <button
              key={category.name}
              className={`category-tab ${activeCategory === index ? 'active' : ''}`}
              onClick={() => setActiveCategory(index)}
              aria-label={`${category.name} category`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="emoji-picker-grid">
          {EMOJI_CATEGORIES[activeCategory].emojis.map(emoji => (
            <button
              key={emoji}
              className={`emoji-item ${emoji === currentEmoji ? 'selected' : ''}`}
              onClick={() => handleEmojiClick(emoji)}
              aria-label={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});