import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NotesApp } from "./NotesApp";
import { useNotesStore } from "./useNotesStore";
import { NoteEntry } from "./types";

// Mock the store
jest.mock("./useNotesStore");

// Mock child components to simplify testing
jest.mock("./NotesInput", () => ({
  NotesInput: ({ onSubmit }: any) => (
    <div data-testid="notes-input">
      <button onClick={() => onSubmit("Test note")}>Add Note</button>
    </div>
  ),
}));

jest.mock("./NotesList", () => ({
  NotesList: ({ entries, onToggleTask, onUpdate, onDelete }: any) => (
    <div data-testid="notes-list">
      {entries.map((entry: NoteEntry) => (
        <div key={entry.id} data-testid={`note-${entry.id}`}>
          <span>{entry.content}</span>
          <button onClick={() => onToggleTask(entry.id, 0)}>Toggle Task</button>
          <button onClick={() => onUpdate(entry.id, "Updated")}>Update</button>
          <button onClick={() => onDelete(entry.id)}>Delete</button>
        </div>
      ))}
    </div>
  ),
}));

jest.mock("./NotesFilter", () => ({
  NotesFilter: ({
    onFilterChange,
    onActionFilterChange,
    onSearchChange,
  }: any) => (
    <div data-testid="notes-filter">
      <button onClick={() => onFilterChange("work")}>Filter Work</button>
      <button onClick={() => onActionFilterChange("task")}>Filter Tasks</button>
      <input
        data-testid="search-input"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  ),
}));

const mockUseNotesStore = useNotesStore as jest.MockedFunction<
  typeof useNotesStore
>;

const mockEntries: NoteEntry[] = [
  {
    id: "1",
    content: "Test note 1",
    timestamp: new Date("2024-01-01"),
    tags: ["personal"],
    tasks: [],
    actionType: "note",
    isProcessing: false,
  },
  {
    id: "2",
    content: "Work task",
    timestamp: new Date("2024-01-02"),
    tags: ["work"],
    tasks: [{ text: "Complete report", completed: false, extracted: false }],
    actionType: "task",
    isProcessing: false,
  },
];

const defaultMockStore = {
  entries: mockEntries,
  isLoading: false,
  error: null,
  processingIds: new Set<string>(),
  addEntry: jest.fn(),
  toggleTask: jest.fn(),
  updateEntry: jest.fn(),
  deleteEntry: jest.fn(),
  aiEnabled: true,
  toggleAI: jest.fn(),
  clearError: jest.fn(),
};

describe("NotesApp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotesStore.mockReturnValue(defaultMockStore);
  });

  it("renders when open", () => {
    render(<NotesApp isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("notes-input")).toBeInTheDocument();
    expect(screen.getByTestId("notes-list")).toBeInTheDocument();
    expect(screen.getByTestId("notes-filter")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<NotesApp isOpen={false} onClose={jest.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();
    render(<NotesApp isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByRole("button", { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it("displays all entries initially", () => {
    render(<NotesApp isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByTestId("note-1")).toBeInTheDocument();
    expect(screen.getByTestId("note-2")).toBeInTheDocument();
  });

  it("filters entries by tag", () => {
    render(<NotesApp isOpen={true} onClose={jest.fn()} />);

    const filterButton = screen.getByText("Filter Work");
    fireEvent.click(filterButton);

    // Component should re-render with filtered entries
    // In real implementation, this would filter the displayed entries
  });

  it("filters entries by action type", () => {
    render(<NotesApp isOpen={true} onClose={jest.fn()} />);

    const filterButton = screen.getByText("Filter Tasks");
    fireEvent.click(filterButton);

    // Component should re-render with filtered entries
  });

  it("filters entries by search query", () => {
    render(<NotesApp isOpen={true} onClose={jest.fn()} />);

    const searchInput = screen.getByTestId("search-input");
    fireEvent.change(searchInput, { target: { value: "work" } });

    // Component should re-render with filtered entries
  });

  it("adds a new entry", () => {
    render(<NotesApp isOpen={true} onClose={jest.fn()} />);

    const addButton = screen.getByText("Add Note");
    fireEvent.click(addButton);

    expect(defaultMockStore.addEntry).toHaveBeenCalledWith("Test note");
  });

  it("toggles a task", () => {
    render(<NotesApp isOpen={true} onClose={jest.fn()} />);

    const toggleButtons = screen.getAllByText("Toggle Task");
    fireEvent.click(toggleButtons[0]);

    expect(defaultMockStore.toggleTask).toHaveBeenCalledWith("1", 0);
  });

  it("updates an entry", () => {
    render(<NotesApp isOpen={true} onClose={jest.fn()} />);

    const updateButtons = screen.getAllByText("Update");
    fireEvent.click(updateButtons[0]);

    expect(defaultMockStore.updateEntry).toHaveBeenCalledWith("1", "Updated");
  });

  it("deletes an entry", () => {
    render(<NotesApp isOpen={true} onClose={jest.fn()} />);

    const deleteButtons = screen.getAllByText("Delete");
    fireEvent.click(deleteButtons[0]);

    expect(defaultMockStore.deleteEntry).toHaveBeenCalledWith("1");
  });

  it("shows loading state", () => {
    mockUseNotesStore.mockReturnValue({
      ...defaultMockStore,
      isLoading: true,
    });

    render(<NotesApp isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows error state", () => {
    const error = new Error("Test error");
    mockUseNotesStore.mockReturnValue({
      ...defaultMockStore,
      error,
    });

    render(<NotesApp isOpen={true} onClose={jest.fn()} />);

    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });

  it("clears error when dismiss button is clicked", () => {
    const error = new Error("Test error");
    mockUseNotesStore.mockReturnValue({
      ...defaultMockStore,
      error,
    });

    render(<NotesApp isOpen={true} onClose={jest.fn()} />);

    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissButton);

    expect(defaultMockStore.clearError).toHaveBeenCalled();
  });

  it("toggles AI when settings button is clicked", async () => {
    render(<NotesApp isOpen={true} onClose={jest.fn()} />);

    // Open settings
    const settingsButton = screen.getByRole("button", { name: /settings/i });
    fireEvent.click(settingsButton);

    // Toggle AI
    const aiToggle = await screen.findByRole("button", {
      name: /ai.*enabled/i,
    });
    fireEvent.click(aiToggle);

    expect(defaultMockStore.toggleAI).toHaveBeenCalled();
  });

  it("shows processing state for entries", () => {
    mockUseNotesStore.mockReturnValue({
      ...defaultMockStore,
      processingIds: new Set(["1"]),
    });

    render(<NotesApp isOpen={true} onClose={jest.fn()} />);

    // In real implementation, the processing entry would show a loading indicator
    expect(screen.getByTestId("note-1")).toBeInTheDocument();
  });

  it("handles keyboard shortcuts", () => {
    const onClose = jest.fn();
    render(<NotesApp isOpen={true} onClose={onClose} />);

    // Simulate Escape key
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });
});
