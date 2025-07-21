import {
  formatTime,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatFileSize,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatDuration,
  capitalize,
  truncate,
  pluralize,
} from "./format";

describe("Format Utilities", () => {
  describe("formatTime", () => {
    it("should format time in 12-hour format", () => {
      const date = new Date("2024-01-15T14:30:00");
      expect(formatTime(date)).toBe("2:30 PM");
    });

    it("should handle midnight correctly", () => {
      const date = new Date("2024-01-15T00:00:00");
      expect(formatTime(date)).toBe("12:00 AM");
    });

    it("should handle noon correctly", () => {
      const date = new Date("2024-01-15T12:00:00");
      expect(formatTime(date)).toBe("12:00 PM");
    });
  });

  describe("formatDate", () => {
    it("should format date in MM/DD/YYYY format", () => {
      const date = new Date("2024-01-15");
      expect(formatDate(date)).toBe("01/15/2024");
    });

    it("should handle single digit months and days", () => {
      const date = new Date("2024-03-05");
      expect(formatDate(date)).toBe("03/05/2024");
    });
  });

  describe("formatDateTime", () => {
    it("should format date and time together", () => {
      const date = new Date("2024-01-15T14:30:00");
      expect(formatDateTime(date)).toBe("01/15/2024 2:30 PM");
    });
  });

  describe("formatRelativeTime", () => {
    const now = new Date("2024-01-15T12:00:00");

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(now);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should format seconds ago", () => {
      const date = new Date("2024-01-15T11:59:30");
      expect(formatRelativeTime(date)).toBe("30 seconds ago");
    });

    it("should format minutes ago", () => {
      const date = new Date("2024-01-15T11:45:00");
      expect(formatRelativeTime(date)).toBe("15 minutes ago");
    });

    it("should format hours ago", () => {
      const date = new Date("2024-01-15T09:00:00");
      expect(formatRelativeTime(date)).toBe("3 hours ago");
    });

    it("should format days ago", () => {
      const date = new Date("2024-01-13T12:00:00");
      expect(formatRelativeTime(date)).toBe("2 days ago");
    });

    it("should format just now for very recent times", () => {
      const date = new Date("2024-01-15T11:59:55");
      expect(formatRelativeTime(date)).toBe("just now");
    });

    it("should handle future dates", () => {
      const date = new Date("2024-01-15T13:00:00");
      expect(formatRelativeTime(date)).toBe("in 1 hour");
    });
  });

  describe("formatFileSize", () => {
    it("should format bytes", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("should format kilobytes", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB");
      expect(formatFileSize(1536)).toBe("1.5 KB");
    });

    it("should format megabytes", () => {
      expect(formatFileSize(1048576)).toBe("1.0 MB");
      expect(formatFileSize(5242880)).toBe("5.0 MB");
    });

    it("should format gigabytes", () => {
      expect(formatFileSize(1073741824)).toBe("1.0 GB");
    });

    it("should handle zero", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });

    it("should handle negative values", () => {
      expect(formatFileSize(-1024)).toBe("-1.0 KB");
    });
  });

  describe("formatNumber", () => {
    it("should format numbers with commas", () => {
      expect(formatNumber(1000)).toBe("1,000");
      expect(formatNumber(1000000)).toBe("1,000,000");
    });

    it("should handle decimals", () => {
      expect(formatNumber(1234.56)).toBe("1,234.56");
    });

    it("should handle negative numbers", () => {
      expect(formatNumber(-1000)).toBe("-1,000");
    });

    it("should handle zero", () => {
      expect(formatNumber(0)).toBe("0");
    });
  });

  describe("formatCurrency", () => {
    it("should format USD currency", () => {
      expect(formatCurrency(1234.56)).toBe("$1,234.56");
    });

    it("should format with different currency codes", () => {
      expect(formatCurrency(1234.56, "EUR")).toMatch(/€|EUR/);
      expect(formatCurrency(1234.56, "GBP")).toMatch(/£|GBP/);
    });

    it("should handle negative amounts", () => {
      expect(formatCurrency(-1234.56)).toMatch(/-?\$1,234\.56/);
    });
  });

  describe("formatPercentage", () => {
    it("should format percentages", () => {
      expect(formatPercentage(0.1234)).toBe("12.34%");
      expect(formatPercentage(1)).toBe("100%");
    });

    it("should handle custom decimal places", () => {
      expect(formatPercentage(0.1234, 0)).toBe("12%");
      expect(formatPercentage(0.1234, 1)).toBe("12.3%");
    });

    it("should handle zero", () => {
      expect(formatPercentage(0)).toBe("0%");
    });
  });

  describe("formatDuration", () => {
    it("should format seconds", () => {
      expect(formatDuration(45)).toBe("45s");
    });

    it("should format minutes and seconds", () => {
      expect(formatDuration(125)).toBe("2m 5s");
    });

    it("should format hours, minutes, and seconds", () => {
      expect(formatDuration(3665)).toBe("1h 1m 5s");
    });

    it("should format days", () => {
      expect(formatDuration(86400)).toBe("1d 0h 0m 0s");
    });

    it("should handle zero", () => {
      expect(formatDuration(0)).toBe("0s");
    });
  });

  describe("capitalize", () => {
    it("should capitalize first letter", () => {
      expect(capitalize("hello")).toBe("Hello");
    });

    it("should handle empty string", () => {
      expect(capitalize("")).toBe("");
    });

    it("should handle single character", () => {
      expect(capitalize("a")).toBe("A");
    });

    it("should not change already capitalized strings", () => {
      expect(capitalize("Hello")).toBe("Hello");
    });

    it("should only capitalize first letter", () => {
      expect(capitalize("hello world")).toBe("Hello world");
    });
  });

  describe("truncate", () => {
    it("should truncate long strings", () => {
      expect(truncate("This is a very long string", 10)).toBe("This is a...");
    });

    it("should not truncate short strings", () => {
      expect(truncate("Short", 10)).toBe("Short");
    });

    it("should handle exact length", () => {
      expect(truncate("Exactly 10", 10)).toBe("Exactly 10");
    });

    it("should handle custom suffix", () => {
      expect(truncate("Long string here", 8, "…")).toBe("Long st…");
    });

    it("should handle empty strings", () => {
      expect(truncate("", 10)).toBe("");
    });
  });

  describe("pluralize", () => {
    it("should handle singular", () => {
      expect(pluralize(1, "item")).toBe("1 item");
    });

    it("should handle plural", () => {
      expect(pluralize(5, "item")).toBe("5 items");
    });

    it("should handle zero", () => {
      expect(pluralize(0, "item")).toBe("0 items");
    });

    it("should handle custom plural form", () => {
      expect(pluralize(2, "child", "children")).toBe("2 children");
    });

    it("should handle irregular plurals", () => {
      expect(pluralize(1, "person", "people")).toBe("1 person");
      expect(pluralize(2, "person", "people")).toBe("2 people");
    });
  });
});
