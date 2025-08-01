import type { Entry } from './types';
import { NotesEntry } from './NotesEntry';
import styles from './Notes.module.css';

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
      <div className={styles.notesEmptyState}>
        <span className={styles.notesEmptyIcon}>📝</span>
        <p className={styles.notesEmptyText}>No notes yet</p>
        <p className={styles.notesEmptyHint}>Start typing above to capture your first thought</p>
      </div>
    );
  }

  return (
    <div className={styles.notesList}>
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
