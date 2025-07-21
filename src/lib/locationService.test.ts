import { locationService } from "./locationService";

// Mock fetch
global.fetch = jest.fn();

// Mock navigator.geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
};

Object.defineProperty(global.navigator, "geolocation", {
  value: mockGeolocation,
  configurable: true,
});

describe("locationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console methods
    jest.spyOn(console, "error").mockImplementation();
    jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getCurrentPosition", () => {
    it("returns coordinates on success", async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 10,
        },
        timestamp: Date.now(),
      };

      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      const result = await locationService.getCurrentPosition();

      expect(result).toEqual({
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
        timestamp: mockPosition.timestamp,
      });

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        {
          enableHighAccuracy: true,
          timeout: 3000,
          maximumAge: 300000,
        },
      );
    });

    it("rejects when geolocation is not supported", async () => {
      // Temporarily remove geolocation
      Object.defineProperty(global.navigator, "geolocation", {
        value: undefined,
        configurable: true,
      });

      await expect(locationService.getCurrentPosition()).rejects.toThrow(
        "Geolocation is not supported by this browser.",
      );

      // Restore geolocation
      Object.defineProperty(global.navigator, "geolocation", {
        value: mockGeolocation,
        configurable: true,
      });
    });

    it("handles permission denied error", async () => {
      const mockError = {
        code: 1, // PERMISSION_DENIED
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success, error) => {
          error(mockError);
        },
      );

      await expect(locationService.getCurrentPosition()).rejects.toThrow(
        "Location access denied by user",
      );
    });

    it("handles position unavailable error", async () => {
      const mockError = {
        code: 2, // POSITION_UNAVAILABLE
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success, error) => {
          error(mockError);
        },
      );

      await expect(locationService.getCurrentPosition()).rejects.toThrow(
        "Location information is unavailable",
      );
    });

    it("handles timeout error", async () => {
      const mockError = {
        code: 3, // TIMEOUT
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementation(
        (success, error) => {
          error(mockError);
        },
      );

      await expect(locationService.getCurrentPosition()).rejects.toThrow(
        "Location request timed out",
      );
    });
  });

  describe("getAddressFromCoordinates", () => {
    it("returns formatted address on success", async () => {
      const mockResponse = {
        display_name: "123 Main St, New York, NY 10001, USA",
        address: {
          road: "Main Street",
          house_number: "123",
          city: "New York",
          postcode: "10001",
          country: "USA",
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await locationService.getAddressFromCoordinates(
        40.7128,
        -74.006,
      );

      expect(result).toEqual({
        street: "Main Street",
        house_number: "123",
        city: "New York",
        postcode: "10001",
        country: "USA",
        formatted: "123 Main St, New York, NY 10001, USA",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://nominatim.openstreetmap.org/reverse?format=json&lat=40.7128&lon=-74.006&zoom=18&addressdetails=1",
      );
    });

    it("handles various street name fields", async () => {
      const testCases = [
        { field: "pedestrian", value: "Broadway Pedestrian" },
        { field: "footway", value: "Park Footway" },
        { field: "path", value: "River Path" },
        { field: "cycleway", value: "Bike Lane" },
        { field: "residential", value: "Residential Street" },
        { field: "avenue", value: "5th Avenue" },
        { field: "street", value: "Wall Street" },
        { field: "way", value: "Queens Way" },
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          display_name: "Test Address",
          address: {
            [testCase.field]: testCase.value,
            city: "New York",
          },
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        });

        const result = await locationService.getAddressFromCoordinates(
          40.7128,
          -74.006,
        );

        expect(result.street).toBe(testCase.value);
      }
    });

    it("handles missing address fields gracefully", async () => {
      const mockResponse = {
        display_name: "Unknown Location",
        address: {},
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await locationService.getAddressFromCoordinates(
        40.7128,
        -74.006,
      );

      expect(result).toEqual({
        street: "",
        house_number: "",
        city: "",
        postcode: "",
        country: "",
        formatted: "Unknown Location",
      });
    });

    it("handles API errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      await expect(
        locationService.getAddressFromCoordinates(40.7128, -74.006),
      ).rejects.toThrow("Failed to get address from coordinates");
    });

    it("handles network errors", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      await expect(
        locationService.getAddressFromCoordinates(40.7128, -74.006),
      ).rejects.toThrow("Failed to get address from coordinates");
    });
  });

  describe("getIPAddress", () => {
    it("returns IP address on success", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ip: "192.168.1.1" }),
      });

      const result = await locationService.getIPAddress();

      expect(result).toBe("192.168.1.1");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.ipify.org?format=json",
      );
    });

    it("handles API errors", async () => {
      // Mock for all retry attempts (initial + 2 retries = 3 total)
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      await expect(locationService.getIPAddress()).rejects.toThrow(
        "Failed to fetch IP address",
      );
    });

    it("handles network errors", async () => {
      // Mock for all retry attempts
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      await expect(locationService.getIPAddress()).rejects.toThrow(
        "Network error",
      );
    });
  });

  describe("getIPLocation", () => {
    it("returns IP location data on success", async () => {
      const mockResponse = {
        ip: "192.168.1.1",
        country_name: "United States",
        region: "New York",
        city: "New York City",
        latitude: 40.7128,
        longitude: -74.006,
        timezone: "America/New_York",
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await locationService.getIPLocation("192.168.1.1");

      expect(result).toEqual({
        ip: "192.168.1.1",
        country: "United States",
        region: "New York",
        city: "New York City",
        lat: 40.7128,
        lon: -74.006,
        timezone: "America/New_York",
      });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://ipapi.co/192.168.1.1/json/",
      );
    });

    it("handles API error responses", async () => {
      const mockResponse = {
        error: true,
        reason: "Invalid IP address",
      };

      // Mock for all retry attempts
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(locationService.getIPLocation("invalid")).rejects.toThrow(
        "Invalid IP address",
      );
    });

    it("handles API errors without reason", async () => {
      const mockResponse = {
        error: true,
      };

      // Mock for all retry attempts
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(locationService.getIPLocation("invalid")).rejects.toThrow(
        "Failed to get location from IP",
      );
    });

    it("handles network errors", async () => {
      // Mock for all retry attempts
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      await expect(
        locationService.getIPLocation("192.168.1.1"),
      ).rejects.toThrow("Network error");
    });
  });

  describe("getFullLocationData", () => {
    it("returns complete location data on success", async () => {
      // Mock IP address fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ip: "192.168.1.1" }),
      });

      // Mock IP location fetch
      const mockIPLocation = {
        ip: "192.168.1.1",
        country_name: "United States",
        region: "New York",
        city: "New York City",
        latitude: 40.7128,
        longitude: -74.006,
        timezone: "America/New_York",
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockIPLocation,
      });

      // Mock GPS position
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 10,
        },
        timestamp: Date.now(),
      };
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success(mockPosition);
      });

      // Mock address fetch
      const mockAddress = {
        display_name: "123 Main St, New York, NY 10001, USA",
        address: {
          road: "Main Street",
          house_number: "123",
          city: "New York",
          postcode: "10001",
          country: "USA",
        },
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAddress,
      });

      const result = await locationService.getFullLocationData();

      expect(result).toEqual({
        timestamp: expect.any(Number),
        ipLocation: {
          ip: "192.168.1.1",
          country: "United States",
          region: "New York",
          city: "New York City",
          lat: 40.7128,
          lon: -74.006,
          timezone: "America/New_York",
        },
        coordinates: {
          latitude: 40.7128,
          longitude: -74.006,
          accuracy: 10,
          timestamp: mockPosition.timestamp,
        },
        address: {
          street: "Main Street",
          house_number: "123",
          city: "New York",
          postcode: "10001",
          country: "USA",
          formatted: "123 Main St, New York, NY 10001, USA",
        },
      });
    });

    it("handles IP location failure gracefully", async () => {
      // Setup fetch mocks in order:
      (global.fetch as jest.Mock)
        // 1. getIPAddress - success
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ip: "192.168.1.1" }),
        })
        // 2-4. getIPLocation - fails (3 retry attempts)
        .mockRejectedValueOnce(new Error("IP location failed"))
        .mockRejectedValueOnce(new Error("IP location failed"))
        .mockRejectedValueOnce(new Error("IP location failed"))
        // 5. getIPAddress again (in catch block) - success
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ip: "192.168.1.1" }),
        })
        // 6. getAddressFromCoordinates - success
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            display_name: "Test Address",
            address: { city: "New York" },
          }),
        });

      // Mock GPS success
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 40.7128, longitude: -74.006, accuracy: 10 },
          timestamp: Date.now(),
        });
      });

      const result = await locationService.getFullLocationData();

      expect(result.ipLocation?.ip).toEqual("192.168.1.1");
      expect(result.coordinates).toBeDefined();
      expect(result.address).toBeDefined();
    });

    it("handles complete IP failure gracefully", async () => {
      // Mock all IP-related failures
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      // Mock GPS success
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        success({
          coords: { latitude: 40.7128, longitude: -74.006, accuracy: 10 },
          timestamp: Date.now(),
        });
      });

      // Need to mock address fetch after IP failures
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error("Network error")) // IP address
        .mockRejectedValueOnce(new Error("Network error")) // IP location
        .mockRejectedValueOnce(new Error("Network error")) // Retry IP address
        .mockResolvedValueOnce({
          // Address fetch
          ok: true,
          json: async () => ({
            display_name: "Test Address",
            address: { city: "New York" },
          }),
        });

      const result = await locationService.getFullLocationData();

      expect(result.ipLocation).toBeUndefined();
      expect(result.coordinates).toBeDefined();
      expect(result.address).toBeUndefined(); // Address will also fail since all fetches are failing
    });

    it("handles GPS failure gracefully", async () => {
      // Mock IP success
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ip: "192.168.1.1" }),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ip: "192.168.1.1",
          country_name: "United States",
          region: "New York",
          city: "New York City",
          latitude: 40.7128,
          longitude: -74.006,
          timezone: "America/New_York",
        }),
      });

      // Mock GPS failure
      mockGeolocation.getCurrentPosition.mockImplementation(
        (success, error) => {
          error({
            code: 1,
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          });
        },
      );

      const result = await locationService.getFullLocationData();

      expect(result.ipLocation).toBeDefined();
      expect(result.coordinates).toBeUndefined();
      expect(result.address).toBeDefined(); // Address is created from IP location
      expect(result.address?.city).toBe("New York City");
      expect(result.address?.country).toBe("United States");
    });
  });
});
