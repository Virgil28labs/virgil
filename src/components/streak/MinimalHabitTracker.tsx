import { memo, useState, useCallback } from 'react';
import { useHabits } from '../../hooks/useHabits';
import { HabitCard } from './HabitCard';
import { AddHabitForm } from './AddHabitForm';
import styles from './MinimalHabitTracker.module.css';
import { timeService } from '../../services/TimeService';

interface MinimalHabitTrackerProps {
  isOpen: boolean
  onClose: () => void
}

export const MinimalHabitTracker = memo(function MinimalHabitTracker({
  isOpen,
  onClose,
}: MinimalHabitTrackerProps) {
  const {
    habits,
    stats,
    addHabit,
    checkIn,
    updateHabit,
    deleteHabit,
    undoCheckIn,
    canCheckInToday,
  } = useHabits();

  const [isAddingHabit, setIsAddingHabit] = useState(false);

  const handleAddHabit = useCallback((name: string, emoji: string) => {
    addHabit(name, emoji);
    setIsAddingHabit(false);
  }, [addHabit]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.habitTrackerBackdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Habit Tracker"
    >
      <div
        className={styles.habitTrackerPanel}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={styles.habitTrackerHeader}>
          <h2>
            <span className={styles.headerIcon}>🔥</span>
            Habit Streaks
          </h2>
          <div className={styles.headerActions}>
            <button
              className={styles.resetButton}
              onClick={() => {
                if (window.confirm('Reset all habits and start fresh? This cannot be undone.')) {
                  localStorage.removeItem('virgil_habits');
                  window.location.reload();
                }
              }}
              aria-label="Reset all habits"
              title="Reset all habits"
            >
              ↺
            </button>
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close habit tracker"
            >
              ×
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className={styles.habitStats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{habits.length}</span>
            <span className={styles.statLabel}>Habits</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.totalCheckIns}</span>
            <span className={styles.statLabel}>Check-ins</span>
          </div>
          <div
            className={`${styles.stat} ${styles.bestStreakStat}`}
            data-start-date={
              stats.bestStreakStartDate
                ? `Started ${timeService.formatDateToLocal(timeService.parseDate(stats.bestStreakStartDate) || timeService.getCurrentDateTime(), {
                  month: 'short',
                  day: 'numeric',
                })}`
                : ''
            }
          >
            <span className={styles.statValue}>{stats.currentStreak}</span>
            <span className={styles.statLabel}>Best Streak</span>
          </div>
        </div>

        {/* Add Habit Form */}
        {isAddingHabit && (
          <div className={styles.addHabitSection}>
            <AddHabitForm
              onAdd={handleAddHabit}
              onCancel={() => setIsAddingHabit(false)}
            />
          </div>
        )}

        {/* Habits Grid */}
        <div className={styles.habitsGrid}>
          {habits.map(habit => (
            <HabitCard
              key={habit.id}
              habit={habit}
              canCheckIn={canCheckInToday(habit.id)}
              onCheckIn={checkIn}
              onUpdate={updateHabit}
              onDelete={deleteHabit}
              onUndo={undoCheckIn}
            />
          ))}

          {/* Add new habit */}
          {habits.length < 10 && !isAddingHabit && (
            <button
              className={styles.addHabitButton}
              onClick={() => setIsAddingHabit(true)}
              aria-label="Add new habit"
            >
              <span className={styles.addIcon}>+</span>
              <span className={styles.addText}>Add New Habit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
