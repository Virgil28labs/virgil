import { TimeServiceEnhanced } from '../TimeServiceEnhanced';

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  listeners: Map<string, ((event: MessageEvent) => void)[]> = new Map();
  static instances: MockBroadcastChannel[] = [];
  
  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }
  
  postMessage(message: any): void {
    // Simulate message delivery to other instances
    MockBroadcastChannel.instances.forEach(instance => {
      if (instance !== this && instance.name === this.name) {
        const event = new MessageEvent('message', { data: message });
        instance.listeners.get('message')?.forEach(listener => listener(event));
      }
    });
  }
  
  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)?.push(listener);
  }
  
  close(): void {
    const index = MockBroadcastChannel.instances.indexOf(this);
    if (index > -1) {
      MockBroadcastChannel.instances.splice(index, 1);
    }
  }
  
  static reset(): void {
    MockBroadcastChannel.instances = [];
  }
}

// Mock performance.now()
let mockPerformanceNow = 0;
global.performance = {
  now: jest.fn(() => mockPerformanceNow),
} as any;

describe('TimeServiceEnhanced', () => {
  let service1: TimeServiceEnhanced;
  let service2: TimeServiceEnhanced;
  
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    MockBroadcastChannel.reset();
    (global as any).BroadcastChannel = MockBroadcastChannel;
    mockPerformanceNow = 0;
    
    // Reset Date.now for consistent tests
    jest.spyOn(Date, 'now').mockReturnValue(1000000);
  });
  
  afterEach(() => {
    if (service1) {
      service1.destroy();
    }
    if (service2) {
      service2.destroy();
    }
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  
  describe('Cross-Tab Synchronization', () => {
    it('should initialize BroadcastChannel when available', () => {
      service1 = new TimeServiceEnhanced();
      
      // Wait for initialization
      jest.runOnlyPendingTimers();
      
      expect(MockBroadcastChannel.instances).toHaveLength(1);
      expect(MockBroadcastChannel.instances[0].name).toBe('time-service-sync');
    });
    
    it('should handle missing BroadcastChannel gracefully', () => {
      delete (global as any).BroadcastChannel;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      service1 = new TimeServiceEnhanced();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('BroadcastChannel not available'),
        expect.any(Error)
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should perform leader election with multiple tabs', () => {
      // Create first service (will become leader)
      jest.spyOn(Date, 'now').mockReturnValue(1000000);
      service1 = new TimeServiceEnhanced();
      
      // Create second service after a delay
      jest.spyOn(Date, 'now').mockReturnValue(2000000);
      service2 = new TimeServiceEnhanced();
      
      // Trigger leader election messages
      jest.runAllTimers();
      
      const tabs1 = service1.getActiveTabs();
      const tabs2 = service2.getActiveTabs();
      
      // Service1 should be leader (lower tab ID)
      const service1Tab = tabs1.find(tab => tab.id.includes('1000000'));
      const service2Tab = tabs2.find(tab => tab.id.includes('2000000'));
      
      expect(service1Tab?.isLeader).toBe(true);
      expect(service2Tab?.isLeader).toBe(false);
    });
    
    it('should broadcast heartbeat messages', () => {
      service1 = new TimeServiceEnhanced();
      
      // Listen for heartbeat
      const channel = MockBroadcastChannel.instances[0];
      let heartbeatReceived = false;
      let heartbeatData: any;
      
      channel.addEventListener('message', (event: MessageEvent) => {
        if (event.data.type === 'HEARTBEAT') {
          heartbeatReceived = true;
          heartbeatData = event.data;
        }
      });
      
      // Trigger heartbeat interval
      jest.advanceTimersByTime(2000);
      
      expect(heartbeatReceived).toBe(true);
      expect(heartbeatData.tabId).toBeDefined();
      expect(heartbeatData.timestamp).toBeDefined();
    });
    
    it('should sync time from leader to follower tabs', () => {
      // Create leader
      jest.spyOn(Date, 'now').mockReturnValue(1000000);
      service1 = new TimeServiceEnhanced();
      
      // Create follower
      jest.spyOn(Date, 'now').mockReturnValue(2000000);
      service2 = new TimeServiceEnhanced();
      
      let updateReceived = false;
      let updateData: any;
      
      // Subscribe to time updates on follower
      service2.subscribeToTimeUpdates((update) => {
        updateReceived = true;
        updateData = update;
      });
      
      // Force a time broadcast
      const channel = MockBroadcastChannel.instances[0];
      channel.postMessage({
        type: 'TIME_SYNC',
        tabId: 'leader-tab',
        timestamp: Date.now(),
        data: {
          currentTime: '12:00',
          currentDate: 'January 1, 2024',
          timestamp: Date.now(),
        },
      });
      
      expect(updateReceived).toBe(true);
      expect(updateData.currentTime).toBeDefined();
      expect(updateData.currentDate).toBeDefined();
      expect(updateData.dateObject).toBeInstanceOf(Date);
    });
  });
  
  describe('Drift Detection', () => {
    it('should detect time drift using monotonic clock', () => {
      service1 = new TimeServiceEnhanced();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Initial time
      mockPerformanceNow = 0;
      jest.spyOn(Date, 'now').mockReturnValue(1000000);
      
      // Advance to trigger initial drift check setup
      jest.advanceTimersByTime(5000);
      
      // Simulate drift after another 5 seconds
      // Monotonic clock advances normally
      mockPerformanceNow = 5000;
      // System clock drifts by 200ms
      jest.spyOn(Date, 'now').mockReturnValue(1005200);
      
      // Trigger drift check
      jest.advanceTimersByTime(5000);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Time drift detected: 200ms')
      );
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should not trigger drift detection for small variations', () => {
      service1 = new TimeServiceEnhanced();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Initial time
      mockPerformanceNow = 0;
      jest.spyOn(Date, 'now').mockReturnValue(1000000);
      
      // Small drift of 50ms (below threshold)
      mockPerformanceNow = 5000;
      jest.spyOn(Date, 'now').mockReturnValue(1005050);
      
      // Trigger drift check
      jest.advanceTimersByTime(5000);
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      
      consoleWarnSpy.mockRestore();
    });
    
    it('should broadcast drift detection to other tabs when leader', () => {
      service1 = new TimeServiceEnhanced();
      
      let driftDetected = false;
      let driftData: any;
      
      // Listen for drift broadcast
      const channel = MockBroadcastChannel.instances[0];
      channel.addEventListener('message', (event: MessageEvent) => {
        if (event.data.type === 'DRIFT_DETECTED') {
          driftDetected = true;
          driftData = event.data;
        }
      });
      
      // Initial setup
      mockPerformanceNow = 0;
      jest.spyOn(Date, 'now').mockReturnValue(1000000);
      
      // Advance to setup drift detection
      jest.advanceTimersByTime(5000);
      
      // Simulate drift
      mockPerformanceNow = 5000;
      jest.spyOn(Date, 'now').mockReturnValue(1005200);
      
      // Trigger drift check
      jest.advanceTimersByTime(5000);
      
      expect(driftDetected).toBe(true);
      expect(driftData.data.drift).toBeGreaterThan(100);
    });
  });
  
  describe('Tab Management', () => {
    it('should track active tabs', () => {
      service1 = new TimeServiceEnhanced();
      service2 = new TimeServiceEnhanced();
      
      // Trigger heartbeat to register tabs
      jest.advanceTimersByTime(2000);
      
      const tabs = service1.getActiveTabs();
      expect(tabs.length).toBeGreaterThanOrEqual(2);
    });
    
    it('should clean up stale tabs', () => {
      service1 = new TimeServiceEnhanced();
      service2 = new TimeServiceEnhanced();
      
      // Register tabs
      jest.advanceTimersByTime(2000);
      
      // Destroy service2
      service2.destroy();
      service2 = null as any;
      
      // Wait for stale tab cleanup (10+ seconds)
      jest.advanceTimersByTime(12000);
      
      const tabs = service1.getActiveTabs();
      expect(tabs).toHaveLength(1);
    });
    
    it('should re-elect leader when current leader becomes stale', () => {
      // Create leader
      jest.spyOn(Date, 'now').mockReturnValue(1000000);
      service1 = new TimeServiceEnhanced();
      
      // Create follower
      jest.spyOn(Date, 'now').mockReturnValue(2000000);
      service2 = new TimeServiceEnhanced();
      
      // Wait for initial election
      jest.advanceTimersByTime(2000);
      
      // Simulate leader going stale (destroy without cleanup)
      if (service1['heartbeatInterval']) {
        clearInterval(service1['heartbeatInterval']);
      }
      
      // Wait for stale cleanup and re-election
      jest.advanceTimersByTime(12000);
      
      const tabs2 = service2.getActiveTabs();
      const service2Tab = tabs2.find(tab => tab.id.includes('2000000'));
      expect(service2Tab?.isLeader).toBe(true);
    });
  });
  
  describe('Synchronization Control', () => {
    it('should allow disabling synchronization', () => {
      service1 = new TimeServiceEnhanced();
      
      // Disable sync
      service1.setSyncEnabled(false);
      
      // Create another service
      service2 = new TimeServiceEnhanced();
      
      // Service1 should not receive broadcasts
      const channel = MockBroadcastChannel.instances[0];
      let messageReceived = false;
      
      channel.addEventListener('message', () => {
        messageReceived = true;
      });
      
      // Broadcast from service2
      MockBroadcastChannel.instances[1].postMessage({
        type: 'TIME_SYNC',
        tabId: 'test',
        timestamp: Date.now(),
      });
      
      expect(messageReceived).toBe(false);
    });
    
    it('should become leader when sync is disabled', () => {
      // Create two services
      jest.spyOn(Date, 'now').mockReturnValue(2000000);
      service1 = new TimeServiceEnhanced();
      
      jest.spyOn(Date, 'now').mockReturnValue(1000000);
      service2 = new TimeServiceEnhanced();
      
      // Wait for election (service2 should be leader)
      jest.advanceTimersByTime(2000);
      
      // Disable sync on service1
      service1.setSyncEnabled(false);
      
      // Service1 should now consider itself leader
      const tabs1 = service1.getActiveTabs();
      const service1Tab = tabs1.find(tab => tab.id.includes('2000000'));
      expect(service1Tab?.isLeader).toBe(true);
    });
  });
  
  describe('Monotonic Clock', () => {
    it('should provide monotonic timestamp', () => {
      service1 = new TimeServiceEnhanced();
      
      mockPerformanceNow = 1234.567;
      const timestamp = service1.getMonotonicTimestamp();
      
      expect(timestamp).toBe(1234.567);
      expect(performance.now).toHaveBeenCalled();
    });
    
    it('should use monotonic clock for drift detection', () => {
      service1 = new TimeServiceEnhanced();
      
      // Verify performance.now is used in drift detection
      jest.advanceTimersByTime(5000);
      
      expect(performance.now).toHaveBeenCalled();
    });
  });
});