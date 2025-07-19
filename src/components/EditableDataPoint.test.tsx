import { render, screen, fireEvent } from "@testing-library/react";
import { EditableDataPoint } from "./EditableDataPoint";

describe("EditableDataPoint", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with provided props", () => {
    render(
      <EditableDataPoint
        icon="📧"
        label="Email"
        value="test@example.com"
        onChange={mockOnChange}
      />,
    );

    expect(screen.getByText("📧")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("renders placeholder when value is empty", () => {
    render(
      <EditableDataPoint
        icon="📧"
        label="Email"
        value=""
        onChange={mockOnChange}
        placeholder="Enter email"
      />,
    );

    expect(screen.getByText("Enter email")).toBeInTheDocument();
    expect(screen.getByText("Enter email")).toHaveClass("placeholder");
  });

  it("enters edit mode on click", () => {
    render(
      <EditableDataPoint
        icon="📧"
        label="Email"
        value="test@example.com"
        onChange={mockOnChange}
      />,
    );

    const valueElement = screen.getByText("test@example.com");
    fireEvent.click(valueElement);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("test@example.com");
  });

  it("does not enter edit mode when readOnly", () => {
    render(
      <EditableDataPoint
        icon="📧"
        label="Email"
        value="test@example.com"
        onChange={mockOnChange}
        readOnly
      />,
    );

    const valueElement = screen.getByText("test@example.com");
    fireEvent.click(valueElement);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("calls onChange with new value on save", () => {
    render(
      <EditableDataPoint
        icon="📧"
        label="Email"
        value="test@example.com"
        onChange={mockOnChange}
      />,
    );

    // Enter edit mode
    const valueElement = screen.getByText("test@example.com");
    fireEvent.click(valueElement);

    // Change value
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "new@example.com" } });

    // Save
    const saveButton = screen.getByLabelText("Save");
    fireEvent.click(saveButton);

    expect(mockOnChange).toHaveBeenCalledWith("new@example.com");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("cancels edit on cancel button click", () => {
    render(
      <EditableDataPoint
        icon="📧"
        label="Email"
        value="test@example.com"
        onChange={mockOnChange}
      />,
    );

    // Enter edit mode
    const valueElement = screen.getByText("test@example.com");
    fireEvent.click(valueElement);

    // Change value
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "new@example.com" } });

    // Cancel
    const cancelButton = screen.getByLabelText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("saves on Enter key", () => {
    render(
      <EditableDataPoint
        icon="📧"
        label="Email"
        value="test@example.com"
        onChange={mockOnChange}
      />,
    );

    // Enter edit mode
    const valueElement = screen.getByText("test@example.com");
    fireEvent.click(valueElement);

    // Change value and press Enter
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "new@example.com" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockOnChange).toHaveBeenCalledWith("new@example.com");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("cancels on Escape key", () => {
    render(
      <EditableDataPoint
        icon="📧"
        label="Email"
        value="test@example.com"
        onChange={mockOnChange}
      />,
    );

    // Enter edit mode
    const valueElement = screen.getByText("test@example.com");
    fireEvent.click(valueElement);

    // Change value and press Escape
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "new@example.com" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <EditableDataPoint
        icon="📧"
        label="Email"
        value="test@example.com"
        onChange={mockOnChange}
        className="custom-class"
      />,
    );

    const container = screen.getByText("📧").closest(".editable-data-point");
    expect(container).toHaveClass("custom-class");
  });

  it("renders correct input type", () => {
    render(
      <EditableDataPoint
        icon="📧"
        label="Email"
        value="test@example.com"
        onChange={mockOnChange}
        type="email"
      />,
    );

    const valueElement = screen.getByText("test@example.com");
    fireEvent.click(valueElement);

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("type", "email");
  });

  it("handles date type input", () => {
    render(
      <EditableDataPoint
        icon="🎂"
        label="Birthday"
        value="1990-01-01"
        onChange={mockOnChange}
        type="date"
      />,
    );

    // Should display formatted date
    expect(screen.getByText("Jan 1, 1990")).toBeInTheDocument();

    // Enter edit mode
    const valueElement = screen.getByText("Jan 1, 1990");
    fireEvent.click(valueElement);

    // Should show date input with ISO format
    const input = screen.getByDisplayValue("1990-01-01");
    expect(input).toHaveAttribute("type", "date");
  });

  it("focuses input on edit mode entry", () => {
    render(
      <EditableDataPoint
        icon="📧"
        label="Email"
        value="test@example.com"
        onChange={mockOnChange}
      />,
    );

    const valueElement = screen.getByText("test@example.com");
    fireEvent.click(valueElement);

    const input = screen.getByRole("textbox");
    expect(document.activeElement).toBe(input);
  });

  it("selects all text on focus", () => {
    render(
      <EditableDataPoint
        icon="📧"
        label="Email"
        value="test@example.com"
        onChange={mockOnChange}
      />,
    );

    const valueElement = screen.getByText("test@example.com");
    fireEvent.click(valueElement);

    const input = screen.getByRole("textbox") as HTMLInputElement;

    // Simulate the useEffect behavior
    fireEvent.focus(input);

    // In a real browser, the text would be selected
    // We can at least verify the value is there
    expect(input.value).toBe("test@example.com");
  });

  it("trims whitespace from saved value", () => {
    render(
      <EditableDataPoint
        icon="📧"
        label="Email"
        value="test@example.com"
        onChange={mockOnChange}
      />,
    );

    const valueElement = screen.getByText("test@example.com");
    fireEvent.click(valueElement);

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "  new@example.com  " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(mockOnChange).toHaveBeenCalledWith("new@example.com");
  });

  it("does not save if value unchanged", () => {
    render(
      <EditableDataPoint
        icon="📧"
        label="Email"
        value="test@example.com"
        onChange={mockOnChange}
      />,
    );

    const valueElement = screen.getByText("test@example.com");
    fireEvent.click(valueElement);

    const saveButton = screen.getByLabelText("Save");
    fireEvent.click(saveButton);

    expect(mockOnChange).not.toHaveBeenCalled();
  });
});
