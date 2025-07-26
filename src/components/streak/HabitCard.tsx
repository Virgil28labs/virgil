import { memo, useCallback, useState } from 'react';
import type { Habit } from '../../types/habit.types';
import { dashboardContextService } from '../../services/DashboardContextService';
import { timeService } from '../../services/TimeService';

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
        habit-card
        ${checkedToday ? 'checked' : ''}
        ${canCheckIn && !checkedToday ? 'can-check' : ''}
        ${isEditing ? 'editing' : ''}
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showActions && !isEditing && (
        <div className="habit-actions">
          <button
            className="edit-button"
            onClick={handleEdit}
            aria-label={`Edit ${habit.name}`}
          >
            ✏️
          </button>
          <button
            className="delete-button"
            onClick={handleDelete}
            aria-label={`Delete ${habit.name}`}
          >
            ×
          </button>
        </div>
      )}

      {isEditing ? (
        <div className="habit-edit-form">
          <input
            type="text"
            value={editEmoji}
            onChange={(e) => setEditEmoji(e.target.value)}
            className="edit-emoji-input"
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
            className="edit-name-input"
            placeholder="Habit name"
            autoFocus
          />
          <div className="edit-actions">
            <button onClick={handleSave} className="save-button">✓</button>
            <button onClick={handleCancel} className="cancel-button">×</button>
          </div>
        </div>
      ) : (
        <button
          className="habit-content"
          onClick={handleCheckIn}
          disabled={!canCheckIn && !checkedToday}
          aria-label={checkedToday ? `Undo check-in for ${habit.name}` : `Check in for ${habit.name}`}
        >
          <div className="habit-emoji">{habit.emoji}</div>
          <div className="habit-name">{habit.name}</div>

          <div className={`habit-streak ${habit.streak > 0 ? 'has-streak' : ''}`}>
            <span className={`streak-icon ${checkedToday ? 'active' : 'inactive'}`}>
              🔥
            </span>
            <span className="streak-count">{habit.streak}</span>
          </div>

          <div className="streak-dots habit-streak-dots">
            {Array.from({ length: 7 }, (_, i) => {
              const date = timeService.subtractDays(timeService.getCurrentDateTime(), 6 - i);
              const dateStr = dashboardContextService.formatDateToLocal(date);
              const isToday = i === 6;
              const isChecked = isToday ? checkedToday : habit.checkIns.includes(dateStr);

              return (
                <div
                  key={dateStr}
                  className="streak-dot-wrapper"
                  title={`${new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date)} - ${isChecked ? 'Completed' : 'Missed'}`}
                >
                  <div
                    className={`
                    streak-dot
                    ${isChecked ? 'checked' : 'missed'}
                    ${isToday ? 'today' : ''}
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
