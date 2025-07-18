import { memo, useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { EmojiSuggestions } from './EmojiSuggestions'
import { EmojiPicker } from './EmojiPicker'
import type { EmojiSuggestion } from '../../types/habit.types'

interface AddHabitFormProps {
  onAdd: (name: string, emoji: string) => void
  onCancel: () => void
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
  { emoji: '🥊', keywords: ['boxing', 'fight', 'combat', 'martial'] },
  { emoji: '🤸', keywords: ['gymnastics', 'flexibility', 'stretch'] },
  { emoji: '⛹️', keywords: ['basketball', 'sport', 'ball'] },
  { emoji: '🏌️', keywords: ['golf', 'sport', 'swing'] },
  
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
  
  // General Achievement
  { emoji: '🌟', keywords: ['star', 'achieve', 'success', 'goal'] },
  { emoji: '🔥', keywords: ['fire', 'streak', 'hot', 'burn', 'passion'] },
  { emoji: '✅', keywords: ['check', 'done', 'complete', 'finish'] },
  { emoji: '🏆', keywords: ['win', 'trophy', 'achieve', 'champion'] },
  { emoji: '🌈', keywords: ['rainbow', 'colorful', 'happy', 'positive'] },
  { emoji: '🚀', keywords: ['launch', 'start', 'go', 'fast'] },
  { emoji: '💎', keywords: ['diamond', 'valuable', 'precious', 'quality'] }
]

export const AddHabitForm = memo(function AddHabitForm({
  onAdd,
  onCancel
}: AddHabitFormProps) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-suggest emoji based on habit name
  const suggestedEmoji = useMemo(() => {
    if (!name.trim()) return '🎯'
    
    const lowercaseName = name.toLowerCase()
    const match = EMOJI_DATABASE.find(({ keywords }) =>
      keywords.some(keyword => lowercaseName.includes(keyword))
    )
    
    return match?.emoji || '🎯'
  }, [name])

  // Use suggested emoji if user hasn't manually selected one
  const displayEmoji = emoji || suggestedEmoji

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onAdd(name.trim(), displayEmoji)
    }
  }, [name, displayEmoji, onAdd])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel()
    }
  }, [onCancel])

  const handleEmojiSelect = useCallback((selectedEmoji: string) => {
    setEmoji(selectedEmoji)
    setShowSuggestions(false)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }, [])

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    // Show suggestions when user starts typing
    if (e.target.value && !showSuggestions && !emoji) {
      setShowSuggestions(true)
    }
  }, [emoji, showSuggestions])

  return (
    <form 
      className="add-habit-form" 
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <div className="form-inputs">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={handleNameChange}
          placeholder="What habit do you want to build?"
          maxLength={30}
          className="habit-name-input"
        />
        
        <button
          type="button"
          className={`emoji-picker-button ${displayEmoji ? 'has-emoji' : 'empty'}`}
          onClick={() => setShowEmojiPicker(true)}
          aria-label="Choose emoji"
          title="Click to choose emoji"
        >
          {displayEmoji}
        </button>
      </div>
      
      <div className="form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="btn-cancel"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="btn-add"
        >
          Create Habit
        </button>
      </div>
      
      {showSuggestions && (
        <div className="suggestions-wrapper">
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
  )
})