/**
 * Custom hook for managing notes state and operations
 * Handles storage, AI processing, and state updates
 */

import { useState, useEffect, useCallback } from 'react';
import type { Entry } from './types';
import { NotesError, ErrorType } from './types';
import { notesStorage } from './storage';
import { processEntryWithAI, shouldProcessContent } from './aiService';
import { timeService } from '../../services/TimeService';
import { extractTasksFromContent, mergeTasksWithAI, toggleTaskAtIndex } from './utils/taskUtils';

/**
 * Main store hook for the notes application
 * Provides all state management and operations for notes
 * 
 * Features:
 * - Automatic IndexedDB persistence
 * - Optimistic updates for better UX
 * - AI processing with graceful fallbacks
 * - Error handling with user-friendly messages
 */
export const useNotesStore = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<NotesError | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  
  const [aiEnabled, setAiEnabled] = useState(() => {
    const saved = localStorage.getItem('notesAiEnabled');
    return saved !== null ? saved === 'true' : true;
  });

  // Load entries from IndexedDB on mount
  useEffect(() => {
    const loadEntries = async () => {
      try {
        setError(null);
        const storedEntries = await notesStorage.getAllEntries();
        setEntries(storedEntries);
      } catch (error) {
        console.error('Failed to load entries:', error);
        setError(
          error instanceof NotesError 
            ? error 
            : new NotesError(
              ErrorType.STORAGE_ERROR,
              'Failed to load your notes. Please refresh the page.',
              error,
            ),
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadEntries();
  }, []);

  /**
   * Adds a new entry with optimistic updates
   * @param content The note content to add
   */
  const addEntry = useCallback(async (content: string) => {
    // Clear any previous errors
    setError(null);
    
    // Create new entry
    const newEntry: Entry = {
      id: crypto.randomUUID(),
      timestamp: timeService.getCurrentDateTime(),
      content,
      tags: [],
      tasks: extractTasksFromContent(content),
      aiProcessed: false,
      isEdited: false,
    };

    // Add to state immediately (optimistic update)
    setEntries(prev => [newEntry, ...prev]);

    try {
      // Save to IndexedDB
      await notesStorage.addEntry(newEntry);

      // Process with AI asynchronously if enabled
      if (aiEnabled && shouldProcessContent(content)) {
        // Mark as processing
        setProcessingIds(prev => new Set(prev).add(newEntry.id));
        
        processEntryWithAI(newEntry.content).then(async (aiData) => {
          if (aiData) {
            const updatedEntry: Entry = {
              ...newEntry,
              tags: aiData.tags,
              actionType: aiData.actionType,
              tasks: mergeTasksWithAI(newEntry.tasks, aiData.tasks),
              aiProcessed: true,
            };

            // Update state
            setEntries(prev => 
              prev.map(entry => 
                entry.id === newEntry.id ? updatedEntry : entry,
              ),
            );

            // Update in IndexedDB
            try {
              await notesStorage.updateEntry(updatedEntry);
            } catch (storageError) {
              console.error('Failed to save AI updates:', storageError);
            }
          }
        }).catch(aiError => {
          console.error('AI processing failed:', aiError);
        }).finally(() => {
          // Remove from processing set
          setProcessingIds(prev => {
            const next = new Set(prev);
            next.delete(newEntry.id);
            return next;
          });
        });
      }
    } catch (error) {
      console.error('Failed to save entry:', error);
      
      // Rollback optimistic update
      setEntries(prev => prev.filter(e => e.id !== newEntry.id));
      
      // Set user-friendly error
      setError(
        error instanceof NotesError
          ? error
          : new NotesError(
            ErrorType.STORAGE_ERROR,
            'Failed to save your note. Please try again.',
            error,
          ),
      );
    }
  }, [aiEnabled]);

  /**
   * Updates an existing entry
   * @param id The entry ID to update
   * @param updates Partial entry updates
   */
  const updateEntry = useCallback(async (id: string, updates: Partial<Entry>) => {
    setError(null);
    
    // Optimistic update
    setEntries(prev => 
      prev.map(entry => 
        entry.id === id 
          ? { ...entry, ...updates, isEdited: true }
          : entry,
      ),
    );

    const entry = entries.find(e => e.id === id);
    if (entry) {
      try {
        await notesStorage.updateEntry({ ...entry, ...updates, isEdited: true });
      } catch (error) {
        console.error('Failed to update entry:', error);
        
        // Rollback optimistic update
        setEntries(prev => 
          prev.map(e => e.id === id ? entry : e),
        );
        
        setError(
          error instanceof NotesError
            ? error
            : new NotesError(
              ErrorType.STORAGE_ERROR,
              'Failed to update the note. Please try again.',
              error,
            ),
        );
      }
    }
  }, [entries]);

  /**
   * Toggles a task completion status
   * @param entryId The entry containing the task
   * @param taskIndex The index of the task to toggle
   */
  const toggleTask = useCallback(async (entryId: string, taskIndex: number) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const updatedTasks = toggleTaskAtIndex(entry.tasks, taskIndex);
    await updateEntry(entryId, { tasks: updatedTasks });
  }, [entries, updateEntry]);

  /**
   * Deletes an entry
   * @param id The ID of the entry to delete
   */
  const deleteEntry = useCallback(async (id: string) => {
    setError(null);
    
    // Store entry for potential rollback
    const entryToDelete = entries.find(e => e.id === id);
    
    // Optimistic update
    setEntries(prev => prev.filter(e => e.id !== id));

    try {
      await notesStorage.deleteEntry(id);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      
      // Rollback if we have the entry
      if (entryToDelete) {
        setEntries(prev => [...prev, entryToDelete].sort((a, b) => 
          // eslint-disable-next-line no-restricted-syntax -- Valid use: sorting by Date timestamps
          b.timestamp.getTime() - a.timestamp.getTime(),
        ));
      }
      
      setError(
        error instanceof NotesError
          ? error
          : new NotesError(
            ErrorType.STORAGE_ERROR,
            'Failed to delete the note. Please try again.',
            error,
          ),
      );
    }
  }, [entries]);

  /**
   * Toggles AI processing on/off
   */
  const toggleAI = useCallback(() => {
    setAiEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('notesAiEnabled', String(newValue));
      return newValue;
    });
  }, []);

  /**
   * Clears the current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    entries,
    isLoading,
    error,
    processingIds,
    addEntry,
    updateEntry,
    toggleTask,
    deleteEntry,
    aiEnabled,
    toggleAI,
    clearError,
  };
};

