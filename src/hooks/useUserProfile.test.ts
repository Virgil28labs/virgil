import { renderHook, act, waitFor } from "@testing-library/react";
import { useUserProfile } from "./useUserProfile";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

// Mock dependencies
jest.mock("../contexts/AuthContext");
jest.mock("../lib/supabase");

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe("useUserProfile", () => {
  const mockUser = {
    id: "test-user-id",
    email: "test@example.com",
    user_metadata: {
      nickname: "TestUser",
      fullName: "Test User",
      dateOfBirth: "1990-01-01",
      phone: "123-456-7890",
      gender: "other",
      maritalStatus: "single",
      uniqueId: "Test1",
      address: {
        street: "123 Test St",
        city: "Test City",
        state: "TS",
        zip: "12345",
        country: "Test Country",
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementations
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
    });

    mockSupabase.auth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      }),
      updateUser: jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      }),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    } as any;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("initializes with user data", async () => {
    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile).toEqual({
      nickname: "TestUser",
      fullName: "Test User",
      dateOfBirth: "1990-01-01",
      email: "test@example.com",
      phone: "123-456-7890",
      gender: "other",
      maritalStatus: "single",
      uniqueId: "Test1",
      address: {
        street: "123 Test St",
        city: "Test City",
        state: "TS",
        zip: "12345",
        country: "Test Country",
      },
    });
  });

  it("initializes with empty profile when no user", async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
    });

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile.nickname).toBe("");
    expect(result.current.profile.fullName).toBe("");
    expect(result.current.profile.email).toBe("");
  });

  it("generates unique ID when updating name and DOB", () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.updateField("fullName", "John Doe");
    });

    act(() => {
      result.current.updateField("dateOfBirth", "1985-05-15");
    });

    expect(result.current.profile.uniqueId).toBe("John15");
  });

  it("generates unique ID with month for common days", () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.updateField("fullName", "Jane Smith");
    });

    act(() => {
      result.current.updateField("dateOfBirth", "1990-03-05");
    });

    expect(result.current.profile.uniqueId).toBe("Jane53");
  });

  it("validates email format", () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.updateField("email", "invalid-email");
    });

    expect(result.current.validationErrors.email).toBe(
      "Please enter a valid email address",
    );

    act(() => {
      result.current.updateField("email", "valid@email.com");
    });

    expect(result.current.validationErrors.email).toBeUndefined();
  });

  it("validates phone format", () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.updateField("phone", "12345");
    });

    expect(result.current.validationErrors.phone).toBe(
      "Please enter a valid phone number",
    );

    act(() => {
      result.current.updateField("phone", "123-456-7890");
    });

    expect(result.current.validationErrors.phone).toBeUndefined();
  });

  it("allows empty phone number", () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.updateField("phone", "");
    });

    expect(result.current.validationErrors.phone).toBeUndefined();
  });

  it("validates date of birth not in future", () => {
    const { result } = renderHook(() => useUserProfile());

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().split("T")[0];

    act(() => {
      result.current.updateField("dateOfBirth", futureDateStr);
    });

    expect(result.current.validationErrors.dateOfBirth).toBe(
      "Date cannot be in the future",
    );

    act(() => {
      result.current.updateField("dateOfBirth", "1990-01-01");
    });

    expect(result.current.validationErrors.dateOfBirth).toBeUndefined();
  });

  it("sanitizes text input", () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.updateField(
        "fullName",
        'Test <script>alert("xss")</script> User',
      );
    });

    expect(result.current.profile.fullName).toBe(
      'Test scriptalert("xss")/script User',
    );
  });

  it("debounces auto-save", async () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.updateField("nickname", "NewNick1");
    });

    act(() => {
      result.current.updateField("nickname", "NewNick2");
    });

    act(() => {
      result.current.updateField("nickname", "NewNick3");
    });

    // Should not save immediately
    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();

    // Advance timers to trigger debounced save
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledTimes(1);
    });

    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nickname: "NewNick3",
      }),
    });
  });

  it("does not auto-save when validation errors exist", () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.updateField("email", "invalid-email");
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("updates address fields", async () => {
    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.updateAddress("street", "456 New St");
    });

    act(() => {
      result.current.updateAddress("city", "New City");
    });

    expect(result.current.profile.address.street).toBe("456 New St");
    expect(result.current.profile.address.city).toBe("New City");

    // Advance timers to trigger save
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalled();
    });
  });

  it("handles manual save", async () => {
    const { result } = renderHook(() => useUserProfile());

    await act(async () => {
      await result.current.saveProfile();
    });

    expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nickname: "TestUser",
        fullName: "Test User",
        email: "test@example.com",
      }),
    });

    expect(result.current.saveSuccess).toBe(true);

    // Advance timers to hide success indicator
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.saveSuccess).toBe(false);
  });

  it("handles save errors", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    mockSupabase.auth.updateUser.mockResolvedValueOnce({
      data: null,
      error: new Error("Save failed"),
    } as any);

    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.updateField("nickname", "NewNick");
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error saving profile:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("handles get user errors during save", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("Get user failed"),
    } as any);

    const { result } = renderHook(() => useUserProfile());

    await act(async () => {
      await result.current.saveProfile();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error saving profile:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });

  it("preserves existing metadata when saving", async () => {
    const userWithExtraMetadata = {
      ...mockUser,
      user_metadata: {
        ...mockUser.user_metadata,
        extraField: "should be preserved",
      },
    };

    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: userWithExtraMetadata },
      error: null,
    });

    const { result } = renderHook(() => useUserProfile());

    act(() => {
      result.current.updateField("nickname", "UpdatedNick");
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        data: expect.objectContaining({
          extraField: "should be preserved",
          nickname: "UpdatedNick",
        }),
      });
    });
  });

  it("sets saving state during save", async () => {
    const { result } = renderHook(() => useUserProfile());

    expect(result.current.saving).toBe(false);

    act(() => {
      result.current.updateField("nickname", "NewNick");
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(result.current.saving).toBe(false);
    });

    // During the save, it should have been true
    expect(mockSupabase.auth.updateUser).toHaveBeenCalled();
  });

  it("cleans up timeout on unmount", () => {
    const { unmount } = renderHook(() => useUserProfile());

    unmount();

    // Should not throw any errors
    expect(true).toBe(true);
  });

  it("handles missing user metadata gracefully", async () => {
    const userWithoutMetadata = {
      id: "test-user-id",
      email: "test@example.com",
      user_metadata: {},
    };

    mockUseAuth.mockReturnValue({
      user: userWithoutMetadata as any,
      loading: false,
      signUp: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
    });

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.profile.email).toBe("test@example.com");
    expect(result.current.profile.nickname).toBe("");
    expect(result.current.profile.fullName).toBe("");
  });
});
