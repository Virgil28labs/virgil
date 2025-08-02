import React, { memo, useState, useCallback } from 'react';
import styles from './MinimalHabitTracker.module.css';

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
    <div className={styles.emojiPickerBackdrop} onClick={handleBackdropClick}>
      <div className={styles.emojiPickerPanel}>
        <div className={styles.emojiPickerHeader}>
          <h3>Choose an emoji</h3>
          <button
            className={styles.emojiPickerClose}
            onClick={onClose}
            aria-label="Close emoji picker"
          >
            ×
          </button>
        </div>

        <div className={styles.emojiPickerCategories}>
          {EMOJI_CATEGORIES.map((category, index) => (
            <button
              key={category.name}
              className={`${styles.categoryTab} ${activeCategory === index ? styles.active : ''}`}
              onClick={() => setActiveCategory(index)}
              aria-label={`${category.name} category`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className={styles.emojiPickerGrid}>
          {EMOJI_CATEGORIES[activeCategory].emojis.map(emoji => (
            <button
              key={emoji}
              className={`${styles.emojiItem} ${emoji === currentEmoji ? styles.selected : ''}`}
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
