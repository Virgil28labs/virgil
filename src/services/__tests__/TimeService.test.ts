import { TimeService } from '../TimeService';

describe('TimeService', () => {
  // Mock Date for consistent testing
  const mockDate = new Date('2024-01-20T14:30:45');
  const originalDate = global.Date;
  const originalDateNow = Date.now;
  let timeService: TimeService;
  
  beforeEach(() => {
    // Setup fake timers first
    jest.useFakeTimers();
    
    // Mock Date constructor
    global.Date = jest.fn((...args: any[]) => {
      if (args.length) {
        // If arguments are passed, create a real date with those args
        return new (originalDate as any)(...args);
      }
      // Otherwise return the mock date
      return mockDate;
    }) as any;
    
    // Preserve static methods
    global.Date.now = () => mockDate.getTime();
    global.Date.parse = originalDate.parse;
    global.Date.UTC = originalDate.UTC;
    
    // Create new instance for each test
    timeService = new TimeService();
  });
  
  afterEach(() => {
    // Clean up the instance
    timeService.destroy();
    jest.useRealTimers();
    global.Date = originalDate;
    global.Date.now = originalDateNow;
  });

  describe('getLocalDate', () => {
    it('should return date in YYYY-MM-DD format', () => {
      const result = timeService.getLocalDate();
      expect(result).toBe('2024-01-20');
    });
    
    it('should cache the date for performance', () => {
      const spy = jest.spyOn(timeService, 'formatDateToLocal');
      
      // First call
      const result1 = timeService.getLocalDate();
      expect(spy).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      const result2 = timeService.getLocalDate();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(result1).toBe(result2);
      
      spy.mockRestore();
    });
  });
  
  describe('formatDateToLocal', () => {
    it('should format any date to YYYY-MM-DD', () => {
      const testDate = new Date('2023-12-25T08:00:00');
      const result = timeService.formatDateToLocal(testDate);
      expect(result).toBe('2023-12-25');
    });
    
    it('should pad single digits with zero', () => {
      const testDate = new Date('2023-01-05T08:00:00');
      const result = timeService.formatDateToLocal(testDate);
      expect(result).toBe('2023-01-05');
    });
  });
  
  describe('getCurrentDateTime', () => {
    it('should return current Date object', () => {
      const result = timeService.getCurrentDateTime();
      expect(result).toEqual(mockDate);
    });
  });
  
  describe('getTimestamp', () => {
    it('should return current timestamp', () => {
      const result = timeService.getTimestamp();
      expect(result).toBe(mockDate.getTime());
    });
  });
  
  describe('formatDate', () => {
    it('should format date for display', () => {
      const result = timeService.formatDate(mockDate);
      expect(result).toBe('January 20, 2024');
    });
    
    it('should use current date if no date provided', () => {
      const result = timeService.formatDate();
      expect(result).toBe('January 20, 2024');
    });
  });
  
  describe('getCurrentTime', () => {
    it('should return time in 24-hour format', () => {
      const result = timeService.getCurrentTime();
      expect(result).toBe('14:30');
    });
  });
  
  describe('getCurrentDate', () => {
    it('should return formatted current date', () => {
      const result = timeService.getCurrentDate();
      expect(result).toBe('January 20, 2024');
    });
  });
  
  describe('getDayOfWeek', () => {
    it('should return lowercase day name', () => {
      const result = timeService.getDayOfWeek();
      expect(result).toBe('saturday');
    });
  });
  
  describe('getTimeOfDay', () => {
    it('should return afternoon for 14:30', () => {
      const result = timeService.getTimeOfDay();
      expect(result).toBe('afternoon');
    });
    
    it('should return correct time periods', () => {
      const testCases = [
        { hour: 6, expected: 'morning' },
        { hour: 12, expected: 'afternoon' },
        { hour: 18, expected: 'evening' },
        { hour: 22, expected: 'night' },
        { hour: 3, expected: 'night' },
      ];
      
      testCases.forEach(({ hour, expected }) => {
        const testDate = new Date(mockDate);
        testDate.setHours(hour);
        global.Date = jest.fn(() => testDate) as any;
        
        const result = timeService.getTimeOfDay();
        expect(result).toBe(expected);
      });
    });
  });
  
  describe('subscribeToTimeUpdates', () => {
    it('should call callback with time updates', () => {
      const callback = jest.fn();
      const unsubscribe = timeService.subscribeToTimeUpdates(callback);
      
      // Fast forward 1 second
      jest.advanceTimersByTime(1000);
      
      expect(callback).toHaveBeenCalledWith({
        currentTime: '14:30',
        currentDate: 'January 20, 2024',
        dateObject: mockDate,
      });
      
      unsubscribe();
    });
    
    it('should stop calling callback after unsubscribe', () => {
      const callback = jest.fn();
      const unsubscribe = timeService.subscribeToTimeUpdates(callback);
      
      // Fast forward 1 second
      jest.advanceTimersByTime(1000);
      expect(callback).toHaveBeenCalledTimes(1);
      
      // Unsubscribe
      unsubscribe();
      callback.mockClear();
      
      // Fast forward another second
      jest.advanceTimersByTime(1000);
      expect(callback).not.toHaveBeenCalled();
    });
    
    it('should handle errors in callbacks gracefully', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      const unsubscribe = timeService.subscribeToTimeUpdates(errorCallback);
      
      // Fast forward 1 second
      jest.advanceTimersByTime(1000);
      
      expect(consoleError).toHaveBeenCalledWith(
        'Error in time update callback:',
        expect.any(Error),
      );
      
      unsubscribe();
      consoleError.mockRestore();
    });
  });
  
  describe('memoization', () => {
    it('should use memoized formatters for performance', () => {
      // Access private formatters to verify they exist
      const service = timeService as any;
      expect(service.timeFormatter).toBeDefined();
      expect(service.dateFormatter).toBeDefined();
      expect(service.dayFormatter).toBeDefined();
      
      // Verify formatters have format method (characteristic of Intl.DateTimeFormat)
      expect(typeof service.timeFormatter.format).toBe('function');
      expect(typeof service.dateFormatter.format).toBe('function');
      expect(typeof service.dayFormatter.format).toBe('function');
    });
  });
});