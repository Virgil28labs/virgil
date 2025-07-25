import { TimeServiceEnhanced } from '../TimeServiceEnhanced';

// Mock performance.now()
const mockPerformanceNow = jest.fn(() => 0);
if (!global.performance) {
  global.performance = {} as any;
}
global.performance.now = mockPerformanceNow;

describe('TimeServiceEnhanced - Simple Tests', () => {
  let service: TimeServiceEnhanced;
  
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockPerformanceNow.mockReturnValue(0);
    jest.spyOn(Date, 'now').mockReturnValue(1000000);
  });
  
  afterEach(() => {
    if (service) {
      service.destroy();
    }
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  
  describe('Basic Functionality', () => {
    it('should extend TimeService with same interface', () => {
      service = new TimeServiceEnhanced();
      
      // Test basic TimeService methods
      expect(service.getLocalDate()).toBeDefined();
      expect(service.getCurrentTime()).toBeDefined();
      expect(service.getCurrentDate()).toBeDefined();
      expect(service.getTimestamp()).toBe(1000000);
    });
    
    it('should provide monotonic timestamp', () => {
      // Set initial value for constructor
      mockPerformanceNow.mockReturnValue(0);
      service = new TimeServiceEnhanced();
      
      // Update the mock to return a new value for our test
      mockPerformanceNow.mockReturnValue(1234.567);
      const timestamp = service.getMonotonicTimestamp();
      
      expect(timestamp).toBe(1234.567);
      expect(performance.now).toHaveBeenCalled();
    });
    
    it('should initialize with a unique tab ID', () => {
      service = new TimeServiceEnhanced();
      const tabs = service.getActiveTabs();
      
      expect(tabs).toHaveLength(1);
      expect(tabs[0].id).toMatch(/^tab-\d+-[a-z0-9]+$/);
    });
    
    it('should consider itself leader when BroadcastChannel is not available', () => {
      // Remove BroadcastChannel
      const originalBC = (global as any).BroadcastChannel;
      delete (global as any).BroadcastChannel;
      
      service = new TimeServiceEnhanced();
      const tabs = service.getActiveTabs();
      
      expect(tabs[0].isLeader).toBe(true);
      
      // Restore
      (global as any).BroadcastChannel = originalBC;
    });
  });
  
  describe('Synchronization Control', () => {
    it('should allow disabling synchronization', () => {
      service = new TimeServiceEnhanced();
      
      // Initially enabled
      const tabsBefore = service.getActiveTabs();
      expect(tabsBefore[0].isLeader).toBeDefined();
      
      // Disable sync
      service.setSyncEnabled(false);
      
      // Should still work
      const tabsAfter = service.getActiveTabs();
      expect(tabsAfter[0].isLeader).toBe(true);
    });
  });
  
  describe('Time Updates', () => {
    it('should continue to provide time updates', () => {
      service = new TimeServiceEnhanced();
      
      let updateCount = 0;
      service.subscribeToTimeUpdates(() => {
        updateCount++;
      });
      
      // Trigger timer
      jest.advanceTimersByTime(3000);
      
      expect(updateCount).toBeGreaterThan(0);
    });
  });
});