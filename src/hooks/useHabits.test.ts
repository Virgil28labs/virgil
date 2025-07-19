import { renderHook, act } from "@testing-library/react";
import { useHabits } from "./useHabits";

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

describe("useHabits", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-20"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("initializes with default data", () => {
    const { result } = renderHook(() => useHabits());

    expect(result.current.habits).toEqual([]);
    expect(result.current.achievements).toHaveLength(5);
    expect(result.current.settings.soundEnabled).toBe(true);
    expect(result.current.stats.totalCheckIns).toBe(0);
    expect(result.current.stats.currentStreak).toBe(0);
  });

  it("loads data from localStorage", () => {
    const storedData = {
      habits: [
        {
          id: "habit-1",
          name: "Exercise",
          emoji: "💪",
          streak: 3,
          longestStreak: 5,
          lastCheckIn: "2024-01-19",
          checkIns: ["2024-01-17", "2024-01-18", "2024-01-19"],
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
      achievements: [],
      settings: { soundEnabled: false },
      stats: {
        totalCheckIns: 3,
        currentStreak: 3,
        perfectDays: [],
      },
    };

    mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(storedData));

    const { result } = renderHook(() => useHabits());

    expect(result.current.habits).toHaveLength(1);
    expect(result.current.habits[0].name).toBe("Exercise");
    expect(result.current.settings.soundEnabled).toBe(false);
  });

  it("handles corrupted localStorage data", () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    mockLocalStorage.getItem.mockReturnValueOnce("invalid json");

    const { result } = renderHook(() => useHabits());

    expect(result.current.habits).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load habit data:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  describe("addHabit", () => {
    it("adds a new habit", () => {
      const { result } = renderHook(() => useHabits());

      act(() => {
        result.current.addHabit("Meditate", "🧘");
      });

      expect(result.current.habits).toHaveLength(1);
      expect(result.current.habits[0]).toMatchObject({
        name: "Meditate",
        emoji: "🧘",
        streak: 0,
        longestStreak: 0,
        lastCheckIn: null,
        checkIns: [],
      });
      expect(result.current.habits[0].id).toMatch(/^habit-/);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it("throws error when max habits reached", () => {
      const { result } = renderHook(() => useHabits());

      // Add 10 habits
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.addHabit(`Habit ${i}`, "📝");
        }
      });

      expect(result.current.habits).toHaveLength(10);

      // Try to add 11th habit
      expect(() => {
        act(() => {
          result.current.addHabit("Extra Habit", "❌");
        });
      }).toThrow("Maximum 10 habits allowed");
    });
  });

  describe("checkIn", () => {
    it("checks in for a habit", () => {
      const { result } = renderHook(() => useHabits());

      act(() => {
        result.current.addHabit("Read", "📚");
      });

      const habitId = result.current.habits[0].id;

      act(() => {
        result.current.checkIn(habitId);
      });

      expect(result.current.habits[0].lastCheckIn).toBe("2024-01-20");
      expect(result.current.habits[0].checkIns).toContain("2024-01-20");
      expect(result.current.habits[0].streak).toBe(1);
      expect(result.current.habits[0].longestStreak).toBe(1);
    });

    it("prevents multiple check-ins on same day", () => {
      const { result } = renderHook(() => useHabits());

      act(() => {
        result.current.addHabit("Exercise", "🏃");
      });

      const habitId = result.current.habits[0].id;

      act(() => {
        result.current.checkIn(habitId);
      });

      const checkInsCount = result.current.habits[0].checkIns.length;

      act(() => {
        result.current.checkIn(habitId);
      });

      expect(result.current.habits[0].checkIns.length).toBe(checkInsCount);
    });

    it("calculates streak correctly", () => {
      const { result } = renderHook(() => useHabits());

      // Create habit with existing check-ins
      const habitData = {
        habits: [
          {
            id: "habit-1",
            name: "Exercise",
            emoji: "💪",
            streak: 0,
            longestStreak: 0,
            lastCheckIn: null,
            checkIns: ["2024-01-18", "2024-01-19"],
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ],
        achievements: [],
        settings: { soundEnabled: true },
        stats: { totalCheckIns: 2, currentStreak: 0, perfectDays: [] },
      };

      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(habitData));
      const { result: loadedResult } = renderHook(() => useHabits());

      act(() => {
        loadedResult.current.checkIn("habit-1");
      });

      expect(loadedResult.current.habits[0].streak).toBe(3);
      expect(loadedResult.current.habits[0].longestStreak).toBe(3);
    });

    it("updates achievements on check-in", () => {
      const { result } = renderHook(() => useHabits());

      act(() => {
        result.current.addHabit("Exercise", "💪");
      });

      const habitId = result.current.habits[0].id;

      act(() => {
        result.current.checkIn(habitId);
      });

      const firstCheckInAchievement = result.current.achievements.find(
        (a) => a.id === "first-checkin",
      );

      expect(firstCheckInAchievement?.progress).toBe(100);
      expect(firstCheckInAchievement?.unlockedAt).toBeTruthy();
    });

    it("tracks perfect days", () => {
      const { result } = renderHook(() => useHabits());

      act(() => {
        result.current.addHabit("Exercise", "💪");
        result.current.addHabit("Read", "📚");
      });

      // Check in all habits
      act(() => {
        result.current.checkIn(result.current.habits[0].id);
        result.current.checkIn(result.current.habits[1].id);
      });

      expect(result.current.stats.perfectDays).toContain("2024-01-20");
    });
  });

  describe("updateHabit", () => {
    it("updates habit name and emoji", () => {
      const { result } = renderHook(() => useHabits());

      act(() => {
        result.current.addHabit("Exercise", "💪");
      });

      const habitId = result.current.habits[0].id;

      act(() => {
        result.current.updateHabit(habitId, {
          name: "Workout",
          emoji: "🏋️",
        });
      });

      expect(result.current.habits[0].name).toBe("Workout");
      expect(result.current.habits[0].emoji).toBe("🏋️");
    });
  });

  describe("deleteHabit", () => {
    it("deletes a habit", () => {
      const { result } = renderHook(() => useHabits());

      act(() => {
        result.current.addHabit("Exercise", "💪");
        result.current.addHabit("Read", "📚");
      });

      const habitId = result.current.habits[0].id;

      act(() => {
        result.current.deleteHabit(habitId);
      });

      expect(result.current.habits).toHaveLength(1);
      expect(result.current.habits[0].name).toBe("Read");
    });
  });

  describe("undoCheckIn", () => {
    it("undoes today's check-in", () => {
      const { result } = renderHook(() => useHabits());

      act(() => {
        result.current.addHabit("Exercise", "💪");
      });

      const habitId = result.current.habits[0].id;

      act(() => {
        result.current.checkIn(habitId);
      });

      expect(result.current.habits[0].lastCheckIn).toBe("2024-01-20");

      act(() => {
        result.current.undoCheckIn(habitId);
      });

      expect(result.current.habits[0].lastCheckIn).toBeNull();
      expect(result.current.habits[0].checkIns).not.toContain("2024-01-20");
    });

    it("does not undo yesterday's check-in", () => {
      const { result } = renderHook(() => useHabits());

      // Create habit with yesterday's check-in
      const habitData = {
        habits: [
          {
            id: "habit-1",
            name: "Exercise",
            emoji: "💪",
            streak: 1,
            longestStreak: 1,
            lastCheckIn: "2024-01-19",
            checkIns: ["2024-01-19"],
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ],
        achievements: [],
        settings: { soundEnabled: true },
        stats: { totalCheckIns: 1, currentStreak: 1, perfectDays: [] },
      };

      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(habitData));
      const { result: loadedResult } = renderHook(() => useHabits());

      act(() => {
        loadedResult.current.undoCheckIn("habit-1");
      });

      expect(loadedResult.current.habits[0].lastCheckIn).toBe("2024-01-19");
      expect(loadedResult.current.habits[0].checkIns).toContain("2024-01-19");
    });

    it("removes perfect day when undoing", () => {
      const { result } = renderHook(() => useHabits());

      act(() => {
        result.current.addHabit("Exercise", "💪");
      });

      const habitId = result.current.habits[0].id;

      act(() => {
        result.current.checkIn(habitId);
      });

      expect(result.current.stats.perfectDays).toContain("2024-01-20");

      act(() => {
        result.current.undoCheckIn(habitId);
      });

      expect(result.current.stats.perfectDays).not.toContain("2024-01-20");
    });
  });

  describe("toggleSetting", () => {
    it("toggles sound setting", () => {
      const { result } = renderHook(() => useHabits());

      expect(result.current.settings.soundEnabled).toBe(true);

      act(() => {
        result.current.toggleSetting("soundEnabled");
      });

      expect(result.current.settings.soundEnabled).toBe(false);

      act(() => {
        result.current.toggleSetting("soundEnabled");
      });

      expect(result.current.settings.soundEnabled).toBe(true);
    });
  });

  describe("canCheckInToday", () => {
    it("returns true when can check in", () => {
      const { result } = renderHook(() => useHabits());

      act(() => {
        result.current.addHabit("Exercise", "💪");
      });

      const habitId = result.current.habits[0].id;

      expect(result.current.canCheckInToday(habitId)).toBe(true);
    });

    it("returns false after checking in today", () => {
      const { result } = renderHook(() => useHabits());

      act(() => {
        result.current.addHabit("Exercise", "💪");
      });

      const habitId = result.current.habits[0].id;

      act(() => {
        result.current.checkIn(habitId);
      });

      expect(result.current.canCheckInToday(habitId)).toBe(false);
    });

    it("returns false for non-existent habit", () => {
      const { result } = renderHook(() => useHabits());

      expect(result.current.canCheckInToday("non-existent")).toBe(false);
    });
  });

  describe("streak calculation", () => {
    it("resets streak after missing a day", () => {
      const habitData = {
        habits: [
          {
            id: "habit-1",
            name: "Exercise",
            emoji: "💪",
            streak: 5,
            longestStreak: 5,
            lastCheckIn: "2024-01-17",
            checkIns: [
              "2024-01-13",
              "2024-01-14",
              "2024-01-15",
              "2024-01-16",
              "2024-01-17",
            ],
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ],
        achievements: [],
        settings: { soundEnabled: true },
        stats: { totalCheckIns: 5, currentStreak: 5, perfectDays: [] },
      };

      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(habitData));
      const { result } = renderHook(() => useHabits());

      // Streak should be reset since last check-in was 3 days ago
      expect(result.current.habits[0].streak).toBe(0);
    });

    it("maintains streak with consecutive days", () => {
      const habitData = {
        habits: [
          {
            id: "habit-1",
            name: "Exercise",
            emoji: "💪",
            streak: 2,
            longestStreak: 2,
            lastCheckIn: "2024-01-19",
            checkIns: ["2024-01-18", "2024-01-19"],
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ],
        achievements: [],
        settings: { soundEnabled: true },
        stats: { totalCheckIns: 2, currentStreak: 2, perfectDays: [] },
      };

      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(habitData));
      const { result } = renderHook(() => useHabits());

      expect(result.current.habits[0].streak).toBe(2);
    });
  });

  describe("achievement progress", () => {
    it("tracks habit builder achievement", () => {
      const { result } = renderHook(() => useHabits());

      // Add 5 habits
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.addHabit(`Habit ${i}`, "📝");
        }
      });

      const habitBuilderAchievement = result.current.achievements.find(
        (a) => a.id === "habit-collector",
      );

      expect(habitBuilderAchievement?.progress).toBe(100);
      expect(habitBuilderAchievement?.unlockedAt).toBeTruthy();
    });

    it("tracks week warrior achievement", () => {
      const habitData = {
        habits: [
          {
            id: "habit-1",
            name: "Exercise",
            emoji: "💪",
            streak: 7,
            longestStreak: 7,
            lastCheckIn: "2024-01-19",
            checkIns: [
              "2024-01-13",
              "2024-01-14",
              "2024-01-15",
              "2024-01-16",
              "2024-01-17",
              "2024-01-18",
              "2024-01-19",
            ],
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ],
        achievements: [
          {
            id: "week-warrior",
            name: "Week Warrior",
            description: "Maintain a 7-day streak",
            icon: "🔥",
            progress: 0,
            requirement: { type: "streak" as const, value: 7 },
          },
        ],
        settings: { soundEnabled: true },
        stats: { totalCheckIns: 7, currentStreak: 7, perfectDays: [] },
      };

      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(habitData));
      const { result } = renderHook(() => useHabits());

      act(() => {
        result.current.checkIn("habit-1");
      });

      const weekWarriorAchievement = result.current.achievements.find(
        (a) => a.id === "week-warrior",
      );

      expect(weekWarriorAchievement?.progress).toBe(100);
      expect(weekWarriorAchievement?.unlockedAt).toBeTruthy();
    });
  });

  describe("best streak calculation", () => {
    it("finds best streak start date", () => {
      const habitData = {
        habits: [
          {
            id: "habit-1",
            name: "Exercise",
            emoji: "💪",
            streak: 3,
            longestStreak: 5,
            lastCheckIn: "2024-01-19",
            checkIns: [
              "2024-01-10",
              "2024-01-11",
              "2024-01-12",
              "2024-01-13",
              "2024-01-14",
              "2024-01-17",
              "2024-01-18",
              "2024-01-19",
            ],
            createdAt: "2024-01-01T00:00:00.000Z",
          },
        ],
        achievements: [],
        settings: { soundEnabled: true },
        stats: { totalCheckIns: 8, currentStreak: 3, perfectDays: [] },
      };

      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(habitData));
      const { result } = renderHook(() => useHabits());

      expect(result.current.stats.bestStreakStartDate).toBe("2024-01-10");
    });

    it("returns null when no streaks", () => {
      const { result } = renderHook(() => useHabits());

      expect(result.current.stats.bestStreakStartDate).toBeNull();
    });
  });

  describe("localStorage errors", () => {
    it("handles save errors gracefully", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      mockLocalStorage.setItem.mockImplementationOnce(() => {
        throw new Error("Storage full");
      });

      const { result } = renderHook(() => useHabits());

      act(() => {
        result.current.addHabit("Exercise", "💪");
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save habit data:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
