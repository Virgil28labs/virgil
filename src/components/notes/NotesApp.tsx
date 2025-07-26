import { useState, useCallback, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { NotesInput } from './NotesInput';
import { NotesList } from './NotesList';
import { NotesFilter } from './NotesFilter';
import { useNotesStore } from './useNotesStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { NotesErrorBoundary } from './NotesErrorBoundary';
import type { FilterType, ActionFilterType, TagType } from './types';
import './notes.css';

interface NotesAppProps {
  isOpen: boolean
  onClose: () => void
}

const NotesAppContent = ({ isOpen, onClose }: NotesAppProps) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeActionFilter, setActiveActionFilter] = useState<ActionFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const { 
    entries, 
    isLoading,
    error,
    processingIds,
    addEntry, 
    toggleTask, 
    updateEntry, 
    deleteEntry, 
    aiEnabled, 
    toggleAI,
    clearError,
  } = useNotesStore();

  // Filter entries based on active filter and search
  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Apply tag filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(entry => 
        entry.tags.includes(activeFilter as TagType),
      );
    }

    // Apply action type filter
    if (activeActionFilter !== 'all') {
      filtered = filtered.filter(entry => 
        entry.actionType === activeActionFilter,
      );
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.content.toLowerCase().includes(query),
      );
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => 
      // eslint-disable-next-line no-restricted-syntax -- Valid use: sorting by Date timestamps
      b.timestamp.getTime() - a.timestamp.getTime(),
    );
  }, [entries, activeFilter, activeActionFilter, searchQuery]);

  const handleAddEntry = useCallback((content: string) => {
    addEntry(content);
  }, [addEntry]);

  // Keyboard shortcuts
  const toggleSearch = useCallback(() => {
    const searchButton = document.querySelector('.notes-search-toggle') as HTMLButtonElement;
    searchButton?.click();
  }, []);

  const toggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  useKeyboardShortcuts([
    {
      key: 'k',
      modifiers: ['cmd', 'ctrl'],
      handler: toggleSearch,
      preventDefault: true,
      description: 'Toggle search',
    },
    {
      key: ',',
      modifiers: ['cmd', 'ctrl'],
      handler: toggleSettings,
      preventDefault: true,
      description: 'Toggle settings',
    },
  ], { enabled: isOpen });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={(
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>Notes</span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              opacity: 0.6,
              fontSize: '1.1rem',
            }}
            aria-label="Settings"
          >
            ⚙️
          </button>
        </div>
      )}
      className="notes-modal"
      size="medium"
    >
      <div className="notes-container">
        <div className="notes-header">
          {showSettings ? (
            <div style={{ 
              padding: '1rem', 
              background: 'rgba(245, 245, 245, 0.05)', 
              borderRadius: '8px',
              marginBottom: '1rem',
            }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Settings</h3>
                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>⌘,</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={toggleAI}
                  style={{ cursor: 'pointer' }}
                />
                <span>Enable AI processing (tags & task extraction)</span>
              </label>
              <p style={{ margin: '0.5rem 0 0 1.5rem', fontSize: '0.75rem', opacity: 0.7 }}>
                When enabled, OpenAI will analyze your entries to suggest tags and extract tasks
              </p>
              <div className="notes-shortcuts" style={{ marginTop: '1.5rem' }}>
                <div className="notes-shortcut">
                  <kbd>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd>
                  <kbd>Enter</kbd>
                  <span>Submit</span>
                </div>
                <div className="notes-shortcut">
                  <kbd>{navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}</kbd>
                  <kbd>K</kbd>
                  <span>Search</span>
                </div>
                <div className="notes-shortcut">
                  <kbd>Esc</kbd>
                  <span>Close</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <NotesInput onSubmit={handleAddEntry} />
              <NotesFilter
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                activeActionFilter={activeActionFilter}
                onActionFilterChange={setActiveActionFilter}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </>
          )}
        </div>
        
        <div className="notes-content">
          {isLoading ? (
            <div className="notes-loading">
              <div className="notes-loading-spinner" />
              <p>Loading your notes...</p>
            </div>
          ) : error ? (
            <div className="notes-error">
              <p className="notes-error-message">{error.message}</p>
              <button 
                onClick={clearError} 
                className="notes-error-retry"
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <NotesList
              entries={filteredEntries}
              onToggleTask={toggleTask}
              onUpdateEntry={updateEntry}
              onDeleteEntry={deleteEntry}
              processingIds={processingIds}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

/**
 * Notes application with error boundary wrapper
 */
export const NotesApp = (props: NotesAppProps) => {
  return (
    <NotesErrorBoundary>
      <NotesAppContent {...props} />
    </NotesErrorBoundary>
  );
};