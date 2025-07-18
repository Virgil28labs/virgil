import { memo, useMemo } from 'react'
import type { EmojiSuggestion } from '../../types/habit.types'

interface EmojiSuggestionsProps {
  searchTerm: string
  onSelect: (emoji: string) => void
  currentEmoji: string
}

// Common habit emojis with keywords
const EMOJI_DATABASE: EmojiSuggestion[] = [
  // Exercise & Fitness
  { emoji: '💪', keywords: ['exercise', 'workout', 'gym', 'strength', 'fitness', 'muscle'] },
  { emoji: '🏃', keywords: ['run', 'running', 'jog', 'cardio', 'marathon'] },
  { emoji: '🚴', keywords: ['bike', 'cycling', 'bicycle', 'ride'] },
  { emoji: '🏋️', keywords: ['weight', 'lift', 'gym', 'strength'] },
  { emoji: '🧘', keywords: ['yoga', 'meditate', 'meditation', 'mindful', 'zen'] },
  { emoji: '🏊', keywords: ['swim', 'swimming', 'pool', 'water'] },
  { emoji: '⚽', keywords: ['soccer', 'football', 'sport', 'ball'] },
  { emoji: '🏀', keywords: ['basketball', 'ball', 'sport', 'hoop'] },
  
  // Health & Wellness
  { emoji: '💧', keywords: ['water', 'hydrate', 'drink', 'hydration'] },
  { emoji: '💊', keywords: ['medicine', 'vitamin', 'pill', 'supplement'] },
  { emoji: '🥗', keywords: ['salad', 'healthy', 'diet', 'vegetables', 'eat'] },
  { emoji: '🍎', keywords: ['fruit', 'apple', 'healthy', 'snack'] },
  { emoji: '😴', keywords: ['sleep', 'rest', 'bed', 'night'] },
  { emoji: '🧘‍♀️', keywords: ['meditate', 'meditation', 'calm', 'relax'] },
  
  // Productivity & Learning
  { emoji: '📚', keywords: ['read', 'book', 'study', 'learn', 'education'] },
  { emoji: '✏️', keywords: ['write', 'journal', 'diary', 'note', 'pen'] },
  { emoji: '📝', keywords: ['notes', 'write', 'todo', 'list'] },
  { emoji: '💻', keywords: ['code', 'computer', 'work', 'programming', 'tech'] },
  { emoji: '🎯', keywords: ['goal', 'target', 'focus', 'aim'] },
  { emoji: '📖', keywords: ['study', 'learn', 'read', 'textbook'] },
  { emoji: '🧠', keywords: ['brain', 'think', 'mind', 'mental', 'smart'] },
  
  // Creative & Hobbies
  { emoji: '🎨', keywords: ['art', 'paint', 'draw', 'creative', 'artist'] },
  { emoji: '🎵', keywords: ['music', 'song', 'listen', 'play'] },
  { emoji: '🎸', keywords: ['guitar', 'instrument', 'music', 'play'] },
  { emoji: '🎹', keywords: ['piano', 'keyboard', 'music', 'instrument'] },
  { emoji: '📸', keywords: ['photo', 'camera', 'picture', 'photography'] },
  { emoji: '🎮', keywords: ['game', 'gaming', 'play', 'video'] },
  
  // Daily Routines
  { emoji: '☕', keywords: ['coffee', 'morning', 'caffeine', 'drink'] },
  { emoji: '🍵', keywords: ['tea', 'drink', 'herbal', 'green'] },
  { emoji: '🧹', keywords: ['clean', 'chore', 'tidy', 'organize'] },
  { emoji: '🌱', keywords: ['plant', 'garden', 'grow', 'nature'] },
  { emoji: '🐕', keywords: ['dog', 'walk', 'pet', 'animal'] },
  { emoji: '🚿', keywords: ['shower', 'bath', 'clean', 'hygiene'] },
  
  // Finance & Work
  { emoji: '💰', keywords: ['money', 'save', 'budget', 'finance'] },
  { emoji: '💳', keywords: ['spend', 'budget', 'finance', 'card'] },
  { emoji: '📊', keywords: ['track', 'data', 'analyze', 'chart'] },
  { emoji: '💼', keywords: ['work', 'job', 'business', 'office'] },
  
  // Social & Communication
  { emoji: '📱', keywords: ['phone', 'call', 'text', 'mobile'] },
  { emoji: '👥', keywords: ['social', 'friends', 'people', 'meet'] },
  { emoji: '💬', keywords: ['chat', 'talk', 'message', 'communicate'] },
  { emoji: '❤️', keywords: ['love', 'heart', 'care', 'family'] },
  
  // Time & Planning
  { emoji: '⏰', keywords: ['time', 'alarm', 'wake', 'early'] },
  { emoji: '📅', keywords: ['calendar', 'schedule', 'plan', 'date'] },
  { emoji: '⏱️', keywords: ['timer', 'stopwatch', 'track', 'time'] },
  
  // General
  { emoji: '🌟', keywords: ['star', 'achieve', 'success', 'goal'] },
  { emoji: '🔥', keywords: ['fire', 'streak', 'hot', 'burn'] },
  { emoji: '✅', keywords: ['check', 'done', 'complete', 'finish'] },
  { emoji: '🏆', keywords: ['win', 'trophy', 'achieve', 'champion'] },
  { emoji: '🌈', keywords: ['rainbow', 'colorful', 'happy', 'positive'] }
]

const POPULAR_EMOJIS = ['🔥', '🎯', '💪', '📚', '💧', '🧘', '✏️', '🏃', '💊', '☕', '😴', '🥗', '💻', '🎨', '🎵', '🧹', '🌱', '💰', '📱', '❤️']

export const EmojiSuggestions = memo(function EmojiSuggestions({
  searchTerm,
  onSelect,
  currentEmoji
}: EmojiSuggestionsProps) {
  const suggestions = useMemo(() => {
    if (!searchTerm.trim()) {
      return POPULAR_EMOJIS
    }
    
    const term = searchTerm.toLowerCase()
    const matches = EMOJI_DATABASE
      .filter(({ keywords }) => 
        keywords.some(keyword => keyword.includes(term))
      )
      .map(({ emoji }) => emoji)
      .slice(0, 20)
    
    // If no matches, show popular emojis
    return matches.length > 0 ? matches : POPULAR_EMOJIS
  }, [searchTerm])
  
  return (
    <div className="emoji-suggestions">
      <div className="suggestions-header">
        {searchTerm.trim() ? 'Suggested emojis:' : 'Popular emojis:'}
      </div>
      <div className="emoji-grid">
        {suggestions.map(emoji => (
          <button
            key={emoji}
            type="button"
            className={`emoji-option ${emoji === currentEmoji ? 'selected' : ''}`}
            onClick={() => onSelect(emoji)}
            aria-label={`Select ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
})