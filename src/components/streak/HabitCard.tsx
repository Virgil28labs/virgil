import { memo, useCallback, useState } from 'react';
import type { Habit } from '../../types/habit.types';
import { dashboardContextService } from '../../services/DashboardContextService';
import { timeService } from '../../services/TimeService';
import styles from './MinimalHabitTracker.module.css';

interface HabitCardProps {
  habit: Habit
  canCheckIn: boolean
  onCheckIn: (habitId: string) => void
  onUpdate: (habitId: string, updates: { name?: string; emoji?: string }) => void
  onDelete: (habitId: string) => void
  onUndo?: (habitId: string) => void
}

export const HabitCard = memo(function HabitCard({
  habit,
  canCheckIn,
  onCheckIn,
  onUpdate,
  onDelete,
  onUndo,
}: HabitCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(habit.name);
  const [editEmoji, setEditEmoji] = useState(habit.emoji);

  const checkedToday = habit.lastCheckIn === dashboardContextService.getLocalDate();

  const handleCheckIn = useCallback(() => {
    if (checkedToday && onUndo) {
      // Undo the check-in
      onUndo(habit.id);
    } else if (canCheckIn) {
      // New check-in
      onCheckIn(habit.id);
    }
  }, [canCheckIn, onCheckIn, onUndo, habit.id, checkedToday]);

  const handleDelete = useCallback(() => {
    if (window.confirm(`Delete "${habit.name}"?`)) {
      onDelete(habit.id);
    }
  }, [onDelete, habit.id, habit.name]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setEditName(habit.name);
    setEditEmoji(habit.emoji);
  }, [habit.name, habit.emoji]);

  const handleSave = useCallback(() => {
    if (editName.trim()) {
      onUpdate(habit.id, { name: editName.trim(), emoji: editEmoji });
      setIsEditing(false);
    }
  }, [habit.id, editName, editEmoji, onUpdate]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditName(habit.name);
    setEditEmoji(habit.emoji);
  }, [habit.name, habit.emoji]);

  return (
    <div
      className={`
        ${styles.habitCard}
        ${checkedToday ? styles.checked : ''}
        ${canCheckIn && !checkedToday ? styles.canCheck : ''}
        ${isEditing ? styles.editing : ''}
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showActions && !isEditing && (
        <div className={styles.habitActions}>
          <button
            className={styles.editButton}
            onClick={handleEdit}
            aria-label={`Edit ${habit.name}`}
          >
            ✏️
          </button>
          <button
            className={styles.deleteButton}
            onClick={handleDelete}
            aria-label={`Delete ${habit.name}`}
          >
            ×
          </button>
        </div>
      )}

      {isEditing ? (
        <div className={styles.habitEditForm}>
          <input
            type="text"
            value={editEmoji}
            onChange={(e) => setEditEmoji(e.target.value)}
            className={styles.editEmojiInput}
            maxLength={2}
          />
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
            className={styles.editNameInput}
            placeholder="Habit name"
            autoFocus
          />
          <div className={styles.editActions}>
            <button onClick={handleSave} className={styles.saveButton}>✓</button>
            <button onClick={handleCancel} className={styles.cancelButton}>×</button>
          </div>
        </div>
      ) : (
        <button
          className={styles.habitContent}
          onClick={handleCheckIn}
          disabled={!canCheckIn && !checkedToday}
          aria-label={checkedToday ? `Undo check-in for ${habit.name}` : `Check in for ${habit.name}`}
        >
          <div className={styles.habitEmoji}>{habit.emoji}</div>
          <div className={styles.habitName}>{habit.name}</div>

          <div className={`${styles.habitStreak} ${habit.streak > 0 ? styles.hasStreak : ''}`}>
            <span className={`${styles.streakIcon} ${checkedToday ? styles.active : styles.inactive}`}>
              🔥
            </span>
            <span className={styles.streakCount}>{habit.streak}</span>
          </div>

          <div className={`${styles.streakDots} ${styles.habitStreakDots}`}>
            {Array.from({ length: 7 }, (_, i) => {
              const date = timeService.subtractDays(timeService.getCurrentDateTime(), 6 - i);
              const dateStr = dashboardContextService.formatDateToLocal(date);
              const isToday = i === 6;
              const isChecked = isToday ? checkedToday : habit.checkIns.includes(dateStr);

              return (
                <div
                  key={dateStr}
                  className={styles.streakDotWrapper}
                  title={`${new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)} - ${isChecked ? 'Completed' : 'Missed'}`}
                >
                  <div
                    className={`
                    ${styles.streakDot}
                    ${isChecked ? styles.checked : styles.missed}
                    ${isToday ? styles.today : ''}
                  `}
                  />
                </div>
              );
            })}
          </div>
        </button>
      )}
    </div>
  );
});
