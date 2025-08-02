import { memo, useMemo } from 'react';
import { EMOJI_DATABASE, POPULAR_EMOJIS } from '../../data/habitEmojis';
import styles from './MinimalHabitTracker.module.css';

interface EmojiSuggestionsProps {
  searchTerm: string
  onSelect: (emoji: string) => void
  currentEmoji: string
}

export const EmojiSuggestions = memo(function EmojiSuggestions({
  searchTerm,
  onSelect,
  currentEmoji,
}: EmojiSuggestionsProps) {
  const suggestions = useMemo(() => {
    if (!searchTerm.trim()) {
      return POPULAR_EMOJIS;
    }

    const term = searchTerm.toLowerCase();
    const matches = EMOJI_DATABASE
      .filter(({ keywords }) =>
        keywords.some(keyword => keyword.includes(term)),
      )
      .map(({ emoji }) => emoji)
      .slice(0, 20);

    // If no matches, show popular emojis
    return matches.length > 0 ? matches : POPULAR_EMOJIS;
  }, [searchTerm]);

  return (
    <div className={styles.emojiSuggestions}>
      <div className={styles.suggestionsHeader}>
        {searchTerm.trim() ? 'Suggested emojis:' : 'Popular emojis:'}
      </div>
      <div className={styles.emojiGrid}>
        {suggestions.map(emoji => (
          <button
            key={emoji}
            type="button"
            className={`${styles.emojiOption} ${emoji === currentEmoji ? styles.selected : ''}`}
            onClick={() => onSelect(emoji)}
            aria-label={`Select ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
});
