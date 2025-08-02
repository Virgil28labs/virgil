import React, { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { EmojiSuggestions } from './EmojiSuggestions';
import { EmojiPicker } from './EmojiPicker';
import { EMOJI_DATABASE } from '../../data/habitEmojis';
import styles from './MinimalHabitTracker.module.css';

interface AddHabitFormProps {
  onAdd: (name: string, emoji: string) => void
  onCancel: () => void
}

export const AddHabitForm = memo(function AddHabitForm({
  onAdd,
  onCancel,
}: AddHabitFormProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-suggest emoji based on habit name
  const suggestedEmoji = useMemo(() => {
    if (!name.trim()) return '🎯';

    const lowercaseName = name.toLowerCase();
    const match = EMOJI_DATABASE.find(({ keywords }) =>
      keywords.some(keyword => lowercaseName.includes(keyword)),
    );

    return match?.emoji || '🎯';
  }, [name]);

  // Use suggested emoji if user hasn't manually selected one
  const displayEmoji = emoji || suggestedEmoji;

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAdd(name.trim(), displayEmoji);
    }
  }, [name, displayEmoji, onAdd]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  }, [onCancel]);

  const handleEmojiSelect = useCallback((selectedEmoji: string) => {
    setEmoji(selectedEmoji);
    setShowSuggestions(false);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  }, []);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    // Show suggestions when user starts typing
    if (e.target.value && !showSuggestions && !emoji) {
      setShowSuggestions(true);
    }
  }, [emoji, showSuggestions]);

  return (
    <form
      className={styles.addHabitForm}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.formInputs}>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="What habit do you want to build?"
          maxLength={30}
          className={styles.habitNameInput}
        />

        <button
          type="button"
          className={`${styles.emojiPickerButton} ${displayEmoji ? styles.hasEmoji : styles.empty}`}
          onClick={() => setShowEmojiPicker(true)}
          aria-label="Choose emoji"
          title="Click to choose emoji"
        >
          {displayEmoji}
        </button>
      </div>

      <div className={styles.formActions}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.btnCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className={styles.btnAdd}
        >
          Create Habit
        </button>
      </div>

      {showSuggestions && (
        <div className={styles.suggestionsWrapper}>
          <EmojiSuggestions
            searchTerm={name}
            onSelect={handleEmojiSelect}
            currentEmoji={displayEmoji}
          />
        </div>
      )}

      {showEmojiPicker && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
          currentEmoji={displayEmoji}
        />
      )}
    </form>
  );
});
