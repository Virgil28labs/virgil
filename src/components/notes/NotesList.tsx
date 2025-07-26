import type { Entry } from './types';
import { NotesEntry } from './NotesEntry';
import './notes.css';

interface NotesListProps {
  entries: Entry[]
  onToggleTask: (entryId: string, taskIndex: number) => void
  onUpdateEntry: (id: string, updates: Partial<Entry>) => void
  onDeleteEntry: (id: string) => void
  processingIds?: Set<string>
}

export const NotesList = ({ entries, onToggleTask, onUpdateEntry, onDeleteEntry, processingIds }: NotesListProps) => {

  if (entries.length === 0) {
    return (
      <div className="notes-empty">
        <span className="notes-empty-icon">📝</span>
        <p className="notes-empty-text">No notes yet</p>
        <p className="notes-empty-hint">Start typing above to capture your first thought</p>
      </div>
    );
  }

  return (
    <div className="notes-list">
      {entries.map(entry => (
        <NotesEntry
          key={entry.id}
          entry={entry}
          onToggleTask={onToggleTask}
          onUpdate={onUpdateEntry}
          onDelete={onDeleteEntry}
          isProcessing={processingIds?.has(entry.id) || false}
        />
      ))}
    </div>
  );
};