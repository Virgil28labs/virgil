import { memo } from 'react'
import { PomodoroStats as Stats } from '../../types/pomodoro.types'
import { getStreakIntensity } from './utils/pomodoroUtils'

interface PomodoroStatsProps {
  stats: Stats
  isOpen: boolean
  onClose: () => void
  onUpdateGoal: (goal: number) => void
  onResetStats: () => void
}

export const PomodoroStats = memo(function PomodoroStats({
  stats,
  isOpen,
  onClose,
  onUpdateGoal,
  onResetStats
}: PomodoroStatsProps) {
  const todayProgress = Math.min(100, (stats.todayCompleted / stats.dailyGoal) * 100)
  const streakIntensity = getStreakIntensity(stats.currentStreak)
  
  // Get day labels for weekly chart
  const getDayLabel = (daysAgo: number): string => {
    if (daysAgo === 0) return 'Today'
    if (daysAgo === 1) return 'Yesterday'
    const date = new Date()
    date.setDate(date.getDate() - (6 - daysAgo))
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  // Calculate max for chart scaling
  const maxWeeklyValue = Math.max(...stats.weeklyCompleted, stats.dailyGoal)
  const chartHeight = 120

  if (!isOpen) return null

  return (
    <div className="stats-panel">
      <div className="stats-header">
        <h3>Your Progress</h3>
        <button 
          className="stats-close"
          onClick={onClose}
          aria-label="Close statistics"
        >
          ×
        </button>
      </div>

      {/* Today's Progress */}
      <div className="stats-section">
        <h4 className="stats-section-title">Today</h4>
        <div className="today-stats">
          <div className="progress-circle">
            <svg width="80" height="80">
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="rgba(178, 165, 193, 0.2)"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r="35"
                fill="none"
                stroke="var(--violet-purple)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${(todayProgress / 100) * 220} 220`}
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
              <text
                x="40"
                y="40"
                textAnchor="middle"
                dominantBaseline="middle"
                className="progress-text"
              >
                {stats.todayCompleted}/{stats.dailyGoal}
              </text>
            </svg>
          </div>
          
          <div className="today-details">
            <div className="stat-item">
              <span className="stat-label">Completed</span>
              <span className="stat-value">{stats.todayCompleted} 🍅</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Daily Goal</span>
              <div className="goal-control">
                <button 
                  onClick={() => onUpdateGoal(stats.dailyGoal - 1)}
                  disabled={stats.dailyGoal <= 1}
                  className="goal-btn"
                  aria-label="Decrease goal"
                >
                  −
                </button>
                <span className="goal-value">{stats.dailyGoal}</span>
                <button 
                  onClick={() => onUpdateGoal(stats.dailyGoal + 1)}
                  disabled={stats.dailyGoal >= 20}
                  className="goal-btn"
                  aria-label="Increase goal"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="stats-section">
        <h4 className="stats-section-title">This Week</h4>
        <div className="weekly-chart">
          {stats.weeklyCompleted.map((count, index) => {
            const height = maxWeeklyValue > 0 
              ? (count / maxWeeklyValue) * chartHeight 
              : 0
            const isToday = index === 6
            
            return (
              <div key={index} className="chart-day">
                <div className="chart-bar-container" style={{ height: chartHeight }}>
                  <div 
                    className={`chart-bar ${isToday ? 'today' : ''}`}
                    style={{ 
                      height: `${height}px`,
                      backgroundColor: isToday ? 'var(--violet-purple)' : 'var(--lavender)'
                    }}
                  >
                    {count > 0 && (
                      <span className="bar-value">{count}</span>
                    )}
                  </div>
                  {/* Goal line */}
                  {isToday && (
                    <div 
                      className="goal-line"
                      style={{ 
                        bottom: `${(stats.dailyGoal / maxWeeklyValue) * chartHeight}px` 
                      }}
                    />
                  )}
                </div>
                <span className="day-label">{getDayLabel(index)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Streak & Lifetime Stats */}
      <div className="stats-section">
        <h4 className="stats-section-title">Achievements</h4>
        <div className="achievements-grid">
          <div className={`achievement-card streak-${streakIntensity}`}>
            <div className="achievement-icon">🔥</div>
            <div className="achievement-info">
              <span className="achievement-value">{stats.currentStreak}</span>
              <span className="achievement-label">Current Streak</span>
            </div>
          </div>
          
          <div className="achievement-card">
            <div className="achievement-icon">🏆</div>
            <div className="achievement-info">
              <span className="achievement-value">{stats.bestStreak}</span>
              <span className="achievement-label">Best Streak</span>
            </div>
          </div>
          
          <div className="achievement-card">
            <div className="achievement-icon">📊</div>
            <div className="achievement-info">
              <span className="achievement-value">{stats.averagePerDay}</span>
              <span className="achievement-label">Daily Average</span>
            </div>
          </div>
          
          <div className="achievement-card">
            <div className="achievement-icon">🎯</div>
            <div className="achievement-info">
              <span className="achievement-value">{stats.totalCompleted}</span>
              <span className="achievement-label">Total Pomodoros</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Stats */}
      <div className="stats-footer">
        <button 
          className="reset-stats-btn"
          onClick={() => {
            if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
              onResetStats()
            }
          }}
        >
          Reset All Statistics
        </button>
      </div>
    </div>
  )
})