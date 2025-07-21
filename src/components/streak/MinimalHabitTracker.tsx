import { memo, useState, useCallback } from "react";
import { useHabits } from "../../hooks/useHabits";
import { HabitCard } from "./HabitCard";
import { AddHabitForm } from "./AddHabitForm";
import "./MinimalHabitTracker.css";

interface MinimalHabitTrackerProps {
  isOpen: boolean;
  onClose: () => void;
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

  const handleAddHabit = useCallback(
    (name: string, emoji: string) => {
      addHabit(name, emoji);
      setIsAddingHabit(false);
    },
    [addHabit],
  );

  if (!isOpen) return null;

  return (
    <div
      className="habit-tracker-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Habit Tracker"
    >
      <div className="habit-tracker-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="habit-tracker-header">
          <h2>
            <span className="header-icon">🔥</span>
            Habit Streaks
          </h2>
          <div className="header-actions">
            <button
              className="reset-button"
              onClick={() => {
                if (
                  window.confirm(
                    "Reset all habits and start fresh? This cannot be undone.",
                  )
                ) {
                  localStorage.removeItem("virgil_habits");
                  window.location.reload();
                }
              }}
              aria-label="Reset all habits"
              title="Reset all habits"
            >
              ↺
            </button>
            <button
              className="close-button"
              onClick={onClose}
              aria-label="Close habit tracker"
            >
              ×
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="habit-stats">
          <div className="stat">
            <span className="stat-value">{habits.length}</span>
            <span className="stat-label">Habits</span>
          </div>
          <div className="stat">
            <span className="stat-value">{stats.totalCheckIns}</span>
            <span className="stat-label">Check-ins</span>
          </div>
          <div
            className="stat best-streak-stat"
            data-start-date={
              stats.bestStreakStartDate
                ? `Started ${new Date(
                    stats.bestStreakStartDate,
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}`
                : ""
            }
          >
            <span className="stat-value">{stats.currentStreak}</span>
            <span className="stat-label">Best Streak</span>
          </div>
        </div>

        {/* Add Habit Form */}
        {isAddingHabit && (
          <div className="add-habit-section">
            <AddHabitForm
              onAdd={handleAddHabit}
              onCancel={() => setIsAddingHabit(false)}
            />
          </div>
        )}

        {/* Habits Grid */}
        <div className="habits-grid">
          {habits.map((habit) => (
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
              className="add-habit-button"
              onClick={() => setIsAddingHabit(true)}
              aria-label="Add new habit"
            >
              <span className="add-icon">+</span>
              <span className="add-text">Add New Habit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
