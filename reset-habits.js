// Reset Habit Tracker Data
// Run this in your browser console while on the Virgil app

(function resetHabits() {
  const STORAGE_KEY = 'virgil_habits';
  
  // Get current data
  const currentData = localStorage.getItem(STORAGE_KEY);
  if (currentData) {
    console.log('Current habit data:', JSON.parse(currentData));
  }
  
  // Create fresh data with empty habits
  const freshData = {
    habits: [],
    achievements: [
      {
        id: 'first-checkin',
        name: 'First Step',
        description: 'Complete your first check-in',
        icon: '✨',
        progress: 0,
        requirement: { type: 'total-checkins', value: 1 },
      },
      {
        id: 'week-warrior',
        name: 'Week Warrior',
        description: 'Maintain a 7-day streak',
        icon: '🔥',
        progress: 0,
        requirement: { type: 'streak', value: 7 },
      },
      {
        id: 'monthly-master',
        name: 'Monthly Master',
        description: 'Maintain a 30-day streak',
        icon: '👑',
        progress: 0,
        requirement: { type: 'streak', value: 30 },
      },
      {
        id: 'perfect-week',
        name: 'Perfect Week',
        description: 'Complete all habits for 7 days',
        icon: '🌟',
        progress: 0,
        requirement: { type: 'perfect-week', value: 7 },
      },
      {
        id: 'habit-collector',
        name: 'Habit Builder',
        description: 'Create 5 habits',
        icon: '🎯',
        progress: 0,
        requirement: { type: 'all-habits', value: 5 },
      },
    ],
    settings: {
      soundEnabled: true,
    },
    stats: {
      totalCheckIns: 0,
      currentStreak: 0,
      perfectDays: [],
    },
  };
  
  // Save fresh data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(freshData));
  
  console.log('✅ Habit data has been reset!');
  console.log('🔄 Please refresh the page to see the changes.');
  
  return 'Habit tracker reset complete!';
})();