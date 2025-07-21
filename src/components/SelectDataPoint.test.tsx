import { render, screen, fireEvent } from "@testing-library/react";
import { SelectDataPoint } from "./SelectDataPoint";

describe("SelectDataPoint", () => {
  const mockOnChange = jest.fn();
  const mockOptions = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders with provided props", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="option1"
        onChange={mockOnChange}
        options={mockOptions}
      />,
    );

    expect(screen.getByText("🎯")).toBeInTheDocument();
    expect(screen.getByText("Choice")).toBeInTheDocument();
    expect(screen.getByText("Option 1")).toBeInTheDocument();
  });

  it("renders placeholder when no value selected", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value=""
        onChange={mockOnChange}
        options={mockOptions}
        placeholder="Select an option"
      />,
    );

    expect(screen.getByText("Select an option")).toBeInTheDocument();
    expect(screen.getByText("Select an option")).toHaveClass("placeholder");
  });

  it("enters edit mode on click", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="option1"
        onChange={mockOnChange}
        options={mockOptions}
      />,
    );

    const valueElement = screen.getByText("Option 1");
    fireEvent.click(valueElement);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Option 1")).toBeInTheDocument();
  });

  it("does not enter edit mode when readOnly", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="option1"
        onChange={mockOnChange}
        options={mockOptions}
        readOnly
      />,
    );

    const valueElement = screen.getByText("Option 1");
    fireEvent.click(valueElement);

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("selects option from dropdown", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="option1"
        onChange={mockOnChange}
        options={mockOptions}
      />,
    );

    // Enter edit mode
    const valueElement = screen.getByText("Option 1");
    fireEvent.click(valueElement);

    // Select different option
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "option2" } });

    // Save
    const saveButton = screen.getByLabelText("Save");
    fireEvent.click(saveButton);

    expect(mockOnChange).toHaveBeenCalledWith("option2");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("allows custom value when allowCustom is true", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="option1"
        onChange={mockOnChange}
        options={mockOptions}
        allowCustom={true}
      />,
    );

    // Enter edit mode
    const valueElement = screen.getByText("Option 1");
    fireEvent.click(valueElement);

    // Select custom option
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "custom" } });

    // Input field should appear
    expect(
      screen.getByPlaceholderText("Enter custom value"),
    ).toBeInTheDocument();
  });

  it("saves custom value", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="option1"
        onChange={mockOnChange}
        options={mockOptions}
        allowCustom={true}
      />,
    );

    // Enter edit mode
    const valueElement = screen.getByText("Option 1");
    fireEvent.click(valueElement);

    // Select custom option
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "custom" } });

    // Enter custom value
    const customInput = screen.getByPlaceholderText("Enter custom value");
    fireEvent.change(customInput, { target: { value: "My Custom Value" } });

    // Save
    const saveButton = screen.getByLabelText("Save");
    fireEvent.click(saveButton);

    expect(mockOnChange).toHaveBeenCalledWith("My Custom Value");
  });

  it("cancels edit on cancel button click", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="option1"
        onChange={mockOnChange}
        options={mockOptions}
      />,
    );

    // Enter edit mode
    const valueElement = screen.getByText("Option 1");
    fireEvent.click(valueElement);

    // Change selection
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "option2" } });

    // Cancel
    const cancelButton = screen.getByLabelText("Cancel");
    fireEvent.click(cancelButton);

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("Option 1")).toBeInTheDocument();
  });

  it("saves on Enter key in select", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="option1"
        onChange={mockOnChange}
        options={mockOptions}
      />,
    );

    // Enter edit mode
    const valueElement = screen.getByText("Option 1");
    fireEvent.click(valueElement);

    // Change selection
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "option2" } });
    fireEvent.keyDown(select, { key: "Enter" });

    expect(mockOnChange).toHaveBeenCalledWith("option2");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("cancels on Escape key", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="option1"
        onChange={mockOnChange}
        options={mockOptions}
      />,
    );

    // Enter edit mode
    const valueElement = screen.getByText("Option 1");
    fireEvent.click(valueElement);

    // Change selection
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "option2" } });
    fireEvent.keyDown(select, { key: "Escape" });

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("Option 1")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="option1"
        onChange={mockOnChange}
        options={mockOptions}
        className="custom-class"
      />,
    );

    const container = screen.getByText("🎯").closest(".select-data-point");
    expect(container).toHaveClass("custom-class");
  });

  it("focuses select on edit mode entry", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="option1"
        onChange={mockOnChange}
        options={mockOptions}
      />,
    );

    const valueElement = screen.getByText("Option 1");
    fireEvent.click(valueElement);

    const select = screen.getByRole("combobox");
    expect(document.activeElement).toBe(select);
  });

  it("handles options without matching value", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="unknown-value"
        onChange={mockOnChange}
        options={mockOptions}
      />,
    );

    // Should display the raw value when no matching option
    expect(screen.getByText("unknown-value")).toBeInTheDocument();
  });

  it("handles empty options array", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value=""
        onChange={mockOnChange}
        options={[]}
        placeholder="No options available"
      />,
    );

    expect(screen.getByText("No options available")).toBeInTheDocument();
  });

  it("trims whitespace from custom value", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="option1"
        onChange={mockOnChange}
        options={mockOptions}
        allowCustom={true}
      />,
    );

    // Enter edit mode
    const valueElement = screen.getByText("Option 1");
    fireEvent.click(valueElement);

    // Select custom option
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "custom" } });

    // Enter custom value with whitespace
    const customInput = screen.getByPlaceholderText("Enter custom value");
    fireEvent.change(customInput, { target: { value: "  Custom Value  " } });

    // Save
    const saveButton = screen.getByLabelText("Save");
    fireEvent.click(saveButton);

    expect(mockOnChange).toHaveBeenCalledWith("Custom Value");
  });

  it("does not save if value unchanged", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="option1"
        onChange={mockOnChange}
        options={mockOptions}
      />,
    );

    const valueElement = screen.getByText("Option 1");
    fireEvent.click(valueElement);

    const saveButton = screen.getByLabelText("Save");
    fireEvent.click(saveButton);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("saves on Enter key in custom input", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="option1"
        onChange={mockOnChange}
        options={mockOptions}
        allowCustom={true}
      />,
    );

    // Enter edit mode
    const valueElement = screen.getByText("Option 1");
    fireEvent.click(valueElement);

    // Select custom option
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "custom" } });

    // Enter custom value and press Enter
    const customInput = screen.getByPlaceholderText("Enter custom value");
    fireEvent.change(customInput, { target: { value: "My Custom Value" } });
    fireEvent.keyDown(customInput, { key: "Enter" });

    expect(mockOnChange).toHaveBeenCalledWith("My Custom Value");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("cancels on Escape key in custom input", () => {
    render(
      <SelectDataPoint
        icon="🎯"
        label="Choice"
        value="option1"
        onChange={mockOnChange}
        options={mockOptions}
        allowCustom={true}
      />,
    );

    // Enter edit mode
    const valueElement = screen.getByText("Option 1");
    fireEvent.click(valueElement);

    // Select custom option
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "custom" } });

    // Enter custom value and press Escape
    const customInput = screen.getByPlaceholderText("Enter custom value");
    fireEvent.change(customInput, { target: { value: "My Custom Value" } });
    fireEvent.keyDown(customInput, { key: "Escape" });

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByText("Option 1")).toBeInTheDocument();
  });
});
