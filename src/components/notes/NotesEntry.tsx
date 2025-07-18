/**
 * Individual note entry component
 * Displays note content with formatting, tasks, tags, and actions
 */

import { useState, useCallback, useMemo, memo } from 'react'
import { Entry } from './types'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { formatRelativeTime } from './utils/dateUtils'
import './NotesEntry.css'

interface NotesEntryProps {
  entry: Entry
  onToggleTask: (entryId: string, taskIndex: number) => void
  onUpdate: (id: string, updates: Partial<Entry>) => void
  onDelete: (id: string) => void
  isProcessing?: boolean
}

/**
 * Renders a single note entry with rich formatting
 * - Checkbox support for tasks
 * - Tag display with visual hierarchy
 * - Edit and delete actions
 * - Relative time display
 * - AI processing indicator
 * 
 * Performance optimized with React.memo and useMemo
 */
const NotesEntryComponent = ({ entry, onToggleTask, onUpdate, onDelete, isProcessing = false }: NotesEntryProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(entry.content)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Format timestamp
  const formattedTime = useMemo(() => formatRelativeTime(entry.timestamp), [entry.timestamp])

  // Parse content to render checkboxes
  const renderedContent = useMemo(() => {
    const lines = entry.content.split('\n')
    let taskIndex = 0

    return lines.map((line, lineIndex) => {
      // Check if this line is a checkbox
      const checkboxMatch = line.match(/^(?:[-*]\s*)?\[([ x])\]\s*(.+)/)
      
      if (checkboxMatch) {
        const currentTaskIndex = taskIndex++
        const task = entry.tasks[currentTaskIndex]
        
        return (
          <div key={lineIndex} className="notes-task-line">
            <label className="notes-checkbox-label">
              <input
                type="checkbox"
                checked={task?.completed || false}
                onChange={() => onToggleTask(entry.id, currentTaskIndex)}
                className="notes-checkbox"
                aria-label={`Task: ${checkboxMatch[2].trim()}`}
              />
              <span className="notes-checkbox-custom"></span>
              <span className={`notes-task-text ${task?.completed ? 'completed' : ''}`}>
                {checkboxMatch[2].trim()}
              </span>
            </label>
          </div>
        )
      }

      // Regular text line
      return (
        <p key={lineIndex} className="notes-text-line">
          {line || '\u00A0'} {/* Non-breaking space for empty lines */}
        </p>
      )
    })
  }, [entry.content, entry.tasks, entry.id, onToggleTask])

  const handleSave = useCallback(() => {
    if (editContent.trim() !== entry.content) {
      onUpdate(entry.id, { content: editContent.trim() })
    }
    setIsEditing(false)
  }, [editContent, entry.content, entry.id, onUpdate])

  const handleCancel = useCallback(() => {
    setEditContent(entry.content)
    setIsEditing(false)
  }, [entry.content])

  const handleDeleteConfirm = useCallback(() => {
    onDelete(entry.id)
    setShowDeleteConfirm(false)
  }, [entry.id, onDelete])

  return (
    <article 
      className={`notes-entry ${isProcessing ? 'ai-processing' : ''}`}
      aria-label={`Note from ${formattedTime}`}
    >
      <header className="notes-entry-header">
        <time className="notes-entry-time">
          {formattedTime}
          {isProcessing && <span className="notes-processing-indicator"> • Processing...</span>}
        </time>
        {(entry.tags.length > 0 || entry.actionType) && (
          <div className="notes-entry-tags">
            {entry.actionType && (
              <span className="notes-action-type" title={`Action type: ${entry.actionType}`}>
                {entry.actionType}
              </span>
            )}
            {entry.tags.map((tag, index) => (
              <span key={index} className="notes-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        {entry.isEdited && <span className="notes-edited-indicator">edited</span>}
      </header>

      <div className="notes-entry-content">
        {isEditing ? (
          <div className="notes-edit-mode">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="notes-edit-textarea"
              autoFocus
              aria-label="Edit note content"
            />
            <div className="notes-edit-actions">
              <button onClick={handleSave} className="notes-button save">
                Save
              </button>
              <button onClick={handleCancel} className="notes-button cancel">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {renderedContent}
            {entry.tasks.filter(task => task.extracted).length > 0 && (
              <div className="notes-extracted-tasks">
                <p className="notes-extracted-label">AI-extracted tasks:</p>
                {entry.tasks.filter(task => task.extracted).map((task, index) => (
                  <div key={index} className="notes-task-line">
                    <label className="notes-checkbox-label">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => {
                          const taskIndex = entry.tasks.findIndex(t => t === task)
                          onToggleTask(entry.id, taskIndex)
                        }}
                        className="notes-checkbox"
                        aria-label={`AI task: ${task.text}`}
                      />
                      <span className="notes-checkbox-custom"></span>
                      <span className={`notes-task-text ${task.completed ? 'completed' : ''}`}>
                        {task.text}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {!isEditing && (
        <div className="notes-entry-actions">
          <button
            onClick={() => setIsEditing(true)}
            className="notes-action-button"
            aria-label="Edit note"
            title="Edit"
          >
            ✏️
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="notes-action-button notes-delete-button"
            aria-label="Delete note"
            title="Delete"
          >
            🗑️
          </button>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </article>
  )
}

// Memoize component to prevent unnecessary re-renders
export const NotesEntry = memo(NotesEntryComponent, (prevProps, nextProps) => {
  return (
    prevProps.entry.id === nextProps.entry.id &&
    prevProps.entry.content === nextProps.entry.content &&
    prevProps.entry.tags.length === nextProps.entry.tags.length &&
    prevProps.entry.tasks.length === nextProps.entry.tasks.length &&
    prevProps.entry.aiProcessed === nextProps.entry.aiProcessed &&
    prevProps.entry.isEdited === nextProps.entry.isEdited &&
    prevProps.entry.actionType === nextProps.entry.actionType &&
    // Check if any task completion status changed
    prevProps.entry.tasks.every((task, index) => 
      task.completed === nextProps.entry.tasks[index]?.completed
    )
  )
})