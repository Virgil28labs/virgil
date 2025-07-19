/**
 * Unit tests for task utility functions
 */

import {
  extractTasksFromContent,
  extractFallbackTasks,
  mergeTasksWithAI,
  countCompletedTasks,
  areAllTasksCompleted,
  toggleTaskAtIndex,
} from "../utils/taskUtils";
import { Task } from "../types";

describe("taskUtils", () => {
  describe("extractTasksFromContent", () => {
    it("should extract checkbox tasks from content", () => {
      const content = `
        [ ] Buy groceries
        [x] Call mom
        - [ ] Finish report
        * [X] Review code
      `;

      const tasks = extractTasksFromContent(content);

      expect(tasks).toHaveLength(4);
      expect(tasks[0]).toEqual({
        text: "Buy groceries",
        completed: false,
        extracted: false,
      });
      expect(tasks[1]).toEqual({
        text: "Call mom",
        completed: true,
        extracted: false,
      });
      expect(tasks[2]).toEqual({
        text: "Finish report",
        completed: false,
        extracted: false,
      });
      expect(tasks[3]).toEqual({
        text: "Review code",
        completed: true,
        extracted: false,
      });
    });

    it("should handle empty content", () => {
      expect(extractTasksFromContent("")).toEqual([]);
    });

    it("should ignore non-checkbox lines", () => {
      const content = `
        Regular text
        [ ] Valid task
        Not a task
      `;

      const tasks = extractTasksFromContent(content);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].text).toBe("Valid task");
    });
  });

  describe("extractFallbackTasks", () => {
    it("should extract tasks with action words", () => {
      const content = `
        Call the dentist tomorrow
        Email the team about the meeting
        Regular note here
        Buy milk on the way home
      `;

      const tasks = extractFallbackTasks(content);

      expect(tasks).toContain("Call the dentist tomorrow");
      expect(tasks).toContain("Email the team about the meeting");
      expect(tasks).toContain("Buy milk on the way home");
      expect(tasks).not.toContain("Regular note here");
    });

    it('should extract "need to" patterns', () => {
      const content = `
        I need to finish the report
        We should review the code
        Must call the client
        Don't forget to buy groceries
      `;

      const tasks = extractFallbackTasks(content);

      expect(tasks).toContain("finish the report");
      expect(tasks).toContain("review the code");
      expect(tasks).toContain("call the client");
      expect(tasks).toContain("buy groceries");
    });

    it("should remove duplicates", () => {
      const content = `
        Call mom
        Need to call mom
        Remember to call mom
      `;

      const tasks = extractFallbackTasks(content);
      expect(tasks).toHaveLength(1);
    });
  });

  describe("mergeTasksWithAI", () => {
    const manualTasks: Task[] = [
      { text: "Buy milk", completed: false, extracted: false },
      { text: "Call dentist", completed: true, extracted: false },
    ];

    it("should merge without duplicates", () => {
      const aiTasks = ["buy milk", "Send email", "Review document"];

      const merged = mergeTasksWithAI(manualTasks, aiTasks);

      expect(merged).toHaveLength(4);
      expect(
        merged.filter((t) => t.text.toLowerCase().includes("milk")),
      ).toHaveLength(1);
      expect(merged.some((t) => t.text === "Send email" && t.extracted)).toBe(
        true,
      );
    });

    it("should mark AI tasks as extracted", () => {
      const aiTasks = ["New task"];

      const merged = mergeTasksWithAI(manualTasks, aiTasks);
      const aiTask = merged.find((t) => t.text === "New task");

      expect(aiTask?.extracted).toBe(true);
      expect(aiTask?.completed).toBe(false);
    });

    it("should handle empty AI tasks", () => {
      const merged = mergeTasksWithAI(manualTasks, []);
      expect(merged).toEqual(manualTasks);
    });
  });

  describe("countCompletedTasks", () => {
    it("should count completed tasks correctly", () => {
      const tasks: Task[] = [
        { text: "Task 1", completed: true, extracted: false },
        { text: "Task 2", completed: false, extracted: false },
        { text: "Task 3", completed: true, extracted: true },
      ];

      expect(countCompletedTasks(tasks)).toBe(2);
    });

    it("should handle empty array", () => {
      expect(countCompletedTasks([])).toBe(0);
    });
  });

  describe("areAllTasksCompleted", () => {
    it("should return true when all tasks are completed", () => {
      const tasks: Task[] = [
        { text: "Task 1", completed: true, extracted: false },
        { text: "Task 2", completed: true, extracted: true },
      ];

      expect(areAllTasksCompleted(tasks)).toBe(true);
    });

    it("should return false when some tasks are not completed", () => {
      const tasks: Task[] = [
        { text: "Task 1", completed: true, extracted: false },
        { text: "Task 2", completed: false, extracted: false },
      ];

      expect(areAllTasksCompleted(tasks)).toBe(false);
    });

    it("should return false for empty array", () => {
      expect(areAllTasksCompleted([])).toBe(false);
    });
  });

  describe("toggleTaskAtIndex", () => {
    const tasks: Task[] = [
      { text: "Task 1", completed: false, extracted: false },
      { text: "Task 2", completed: true, extracted: false },
    ];

    it("should toggle task completion status", () => {
      const updated = toggleTaskAtIndex(tasks, 0);

      expect(updated[0].completed).toBe(true);
      expect(updated[1].completed).toBe(true);
      expect(updated).not.toBe(tasks); // Should return new array
    });

    it("should handle invalid index", () => {
      expect(toggleTaskAtIndex(tasks, -1)).toEqual(tasks);
      expect(toggleTaskAtIndex(tasks, 10)).toEqual(tasks);
    });
  });
});
