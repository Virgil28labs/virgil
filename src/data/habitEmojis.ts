import type { EmojiSuggestion } from '../types/habit.types';

// Comprehensive emoji database for habit suggestions
export const EMOJI_DATABASE: EmojiSuggestion[] = [
  // Exercise & Fitness
  { emoji: '💪', keywords: ['exercise', 'workout', 'gym', 'strength', 'fitness', 'muscle'] },
  { emoji: '🏃', keywords: ['run', 'running', 'jog', 'cardio', 'marathon'] },
  { emoji: '🚴', keywords: ['bike', 'cycling', 'bicycle', 'ride'] },
  { emoji: '🏋️', keywords: ['weight', 'lift', 'gym', 'strength'] },
  { emoji: '🧘', keywords: ['yoga', 'meditate', 'meditation', 'mindful', 'zen'] },
  { emoji: '🏊', keywords: ['swim', 'swimming', 'pool', 'water'] },
  { emoji: '🥊', keywords: ['boxing', 'fight', 'combat', 'martial'] },
  { emoji: '🤸', keywords: ['gymnastics', 'flexibility', 'stretch'] },
  { emoji: '⛹️', keywords: ['basketball', 'sport', 'ball'] },
  { emoji: '🏌️', keywords: ['golf', 'sport', 'swing'] },
  { emoji: '⚽', keywords: ['soccer', 'football', 'sport', 'ball'] },
  { emoji: '🏀', keywords: ['basketball', 'ball', 'sport', 'hoop'] },

  // Health & Wellness
  { emoji: '💧', keywords: ['water', 'hydrate', 'drink', 'hydration'] },
  { emoji: '💊', keywords: ['medicine', 'vitamin', 'pill', 'supplement'] },
  { emoji: '🥗', keywords: ['salad', 'healthy', 'diet', 'vegetables', 'eat'] },
  { emoji: '🍎', keywords: ['fruit', 'apple', 'healthy', 'snack'] },
  { emoji: '😴', keywords: ['sleep', 'rest', 'bed', 'night', 'nap'] },
  { emoji: '🧖', keywords: ['spa', 'relax', 'self-care', 'wellness'] },
  { emoji: '🩺', keywords: ['doctor', 'health', 'medical', 'checkup'] },
  { emoji: '🦷', keywords: ['teeth', 'dental', 'brush', 'floss'] },
  { emoji: '🧴', keywords: ['skincare', 'lotion', 'routine'] },
  { emoji: '🧘‍♀️', keywords: ['meditate', 'meditation', 'calm', 'relax'] },

  // Learning & Productivity
  { emoji: '📚', keywords: ['read', 'book', 'study', 'learn', 'education'] },
  { emoji: '✏️', keywords: ['write', 'journal', 'diary', 'note', 'pen'] },
  { emoji: '📝', keywords: ['notes', 'write', 'todo', 'list'] },
  { emoji: '💻', keywords: ['code', 'computer', 'work', 'programming', 'tech'] },
  { emoji: '🎯', keywords: ['goal', 'target', 'focus', 'aim'] },
  { emoji: '📖', keywords: ['study', 'learn', 'read', 'textbook'] },
  { emoji: '🧠', keywords: ['brain', 'think', 'mind', 'mental', 'smart'] },
  { emoji: '📊', keywords: ['track', 'data', 'analyze', 'chart'] },
  { emoji: '🗓️', keywords: ['plan', 'schedule', 'calendar', 'organize'] },
  { emoji: '💡', keywords: ['idea', 'creative', 'think', 'innovation'] },

  // Creative & Hobbies
  { emoji: '🎨', keywords: ['art', 'paint', 'draw', 'creative', 'artist'] },
  { emoji: '🎵', keywords: ['music', 'song', 'listen', 'play'] },
  { emoji: '🎸', keywords: ['guitar', 'instrument', 'music', 'play'] },
  { emoji: '🎹', keywords: ['piano', 'keyboard', 'music', 'instrument'] },
  { emoji: '📸', keywords: ['photo', 'camera', 'picture', 'photography'] },
  { emoji: '🎮', keywords: ['game', 'gaming', 'play', 'video'] },
  { emoji: '✂️', keywords: ['craft', 'cut', 'diy', 'make'] },
  { emoji: '🧶', keywords: ['knit', 'yarn', 'craft', 'hobby'] },
  { emoji: '🎭', keywords: ['theater', 'drama', 'act', 'perform'] },

  // Daily Routines
  { emoji: '☕', keywords: ['coffee', 'morning', 'caffeine', 'drink'] },
  { emoji: '🍵', keywords: ['tea', 'drink', 'herbal', 'green'] },
  { emoji: '🧹', keywords: ['clean', 'chore', 'tidy', 'organize'] },
  { emoji: '🌱', keywords: ['plant', 'garden', 'grow', 'nature'] },
  { emoji: '🐕', keywords: ['dog', 'walk', 'pet', 'animal'] },
  { emoji: '🚿', keywords: ['shower', 'bath', 'clean', 'hygiene'] },
  { emoji: '🍳', keywords: ['cook', 'breakfast', 'meal', 'food'] },
  { emoji: '🛏️', keywords: ['bed', 'make', 'tidy', 'morning'] },
  { emoji: '👕', keywords: ['clothes', 'laundry', 'outfit'] },

  // Finance & Career
  { emoji: '💰', keywords: ['money', 'save', 'budget', 'finance'] },
  { emoji: '💳', keywords: ['spend', 'budget', 'finance', 'card'] },
  { emoji: '💼', keywords: ['work', 'job', 'business', 'office'] },
  { emoji: '📈', keywords: ['invest', 'grow', 'stocks', 'finance'] },
  { emoji: '🏦', keywords: ['bank', 'save', 'money', 'finance'] },
  { emoji: '💸', keywords: ['spend', 'money', 'expense', 'budget'] },

  // Social & Relationships
  { emoji: '📱', keywords: ['phone', 'call', 'text', 'mobile'] },
  { emoji: '👥', keywords: ['social', 'friends', 'people', 'meet'] },
  { emoji: '💬', keywords: ['chat', 'talk', 'message', 'communicate'] },
  { emoji: '❤️', keywords: ['love', 'heart', 'care', 'family'] },
  { emoji: '👪', keywords: ['family', 'time', 'together', 'home'] },
  { emoji: '🤝', keywords: ['meet', 'network', 'connect', 'social'] },

  // Mindfulness & Spirituality
  { emoji: '🙏', keywords: ['pray', 'grateful', 'thanks', 'spiritual'] },
  { emoji: '☮️', keywords: ['peace', 'calm', 'zen', 'mindful'] },
  { emoji: '🕉️', keywords: ['om', 'spiritual', 'meditate', 'yoga'] },
  { emoji: '⚡', keywords: ['energy', 'power', 'charge', 'electric'] },

  // Time & Planning
  { emoji: '⏰', keywords: ['time', 'alarm', 'wake', 'early'] },
  { emoji: '📅', keywords: ['calendar', 'schedule', 'plan', 'date'] },
  { emoji: '⏱️', keywords: ['timer', 'stopwatch', 'track', 'time'] },

  // General Achievement
  { emoji: '🌟', keywords: ['star', 'achieve', 'success', 'goal'] },
  { emoji: '🔥', keywords: ['fire', 'streak', 'hot', 'burn', 'passion'] },
  { emoji: '✅', keywords: ['check', 'done', 'complete', 'finish'] },
  { emoji: '🏆', keywords: ['win', 'trophy', 'achieve', 'champion'] },
  { emoji: '🌈', keywords: ['rainbow', 'colorful', 'happy', 'positive'] },
  { emoji: '🚀', keywords: ['launch', 'start', 'go', 'fast'] },
  { emoji: '💎', keywords: ['diamond', 'valuable', 'precious', 'quality'] },
];

// Popular emojis for quick selection
export const POPULAR_EMOJIS = ['🔥', '🎯', '💪', '📚', '💧', '🧘', '✏️', '🏃', '💊', '☕', '😴', '🥗', '💻', '🎨', '🎵', '🧹', '🌱', '💰', '📱', '❤️'];
