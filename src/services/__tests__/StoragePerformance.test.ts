/**
 * Storage Performance Tests
 * 
 * Simple performance measurements as part of the test suite
 */

import { StorageService } from '../StorageService';

describe('Storage Performance', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('localStorage Performance', () => {
    it('should perform read operations under 1ms average', () => {
      // Setup test data
      StorageService.set('perf-test', { data: 'test value' });
      
      const iterations = 1000;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        StorageService.get('perf-test', {});
        const end = performance.now();
        times.push(end - start);
      }
      
      const average = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`localStorage read average: ${average.toFixed(3)}ms`);
      
      expect(average).toBeLessThan(1);
    });

    it('should perform write operations under 2ms average', () => {
      const iterations = 1000;
      const times: number[] = [];
      const testData = { id: 1, value: 'test', timestamp: Date.now() };
      
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        StorageService.set(`perf-write-${i % 10}`, testData);
        const end = performance.now();
        times.push(end - start);
      }
      
      const average = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`localStorage write average: ${average.toFixed(3)}ms`);
      
      expect(average).toBeLessThan(2);
    });

    it('should handle large objects efficiently', () => {
      const largeObject = {
        data: Array(100).fill(0).map((_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: 'x'.repeat(100),
          metadata: { created: Date.now(), tags: ['tag1', 'tag2', 'tag3'] },
        })),
      };
      
      const writeStart = performance.now();
      StorageService.set('large-object', largeObject);
      const writeEnd = performance.now();
      const writeTime = writeEnd - writeStart;
      
      const readStart = performance.now();
      const retrieved = StorageService.get('large-object', {});
      const readEnd = performance.now();
      const readTime = readEnd - readStart;
      
      console.log(`Large object write: ${writeTime.toFixed(3)}ms`);
      console.log(`Large object read: ${readTime.toFixed(3)}ms`);
      
      expect(writeTime).toBeLessThan(50);
      expect(readTime).toBeLessThan(10);
      expect(retrieved).toEqual(largeObject);
    });

    it('should maintain performance with multiple keys', () => {
      // Populate storage with multiple keys
      for (let i = 0; i < 100; i++) {
        StorageService.set(`multi-key-${i}`, { index: i, data: `value-${i}` });
      }
      
      // Measure read performance with populated storage
      const times: number[] = [];
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        StorageService.get(`multi-key-${i}`, {});
        const end = performance.now();
        times.push(end - start);
      }
      
      const average = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Read with 100 keys in storage: ${average.toFixed(3)}ms average`);
      
      expect(average).toBeLessThan(1);
    });
  });

  describe('Backward Compatibility Performance', () => {
    it('should efficiently handle legacy string values', () => {
      // Simulate legacy values
      localStorage.setItem('legacy-1', 'plain string');
      localStorage.setItem('legacy-2', '42');
      localStorage.setItem('legacy-3', 'true');
      
      const times: number[] = [];
      
      for (let i = 0; i < 1000; i++) {
        const start = performance.now();
        StorageService.get('legacy-1', '');
        StorageService.get('legacy-2', 0);
        StorageService.get('legacy-3', false);
        const end = performance.now();
        times.push(end - start);
      }
      
      const average = times.reduce((a, b) => a + b, 0) / times.length / 3; // Per operation
      console.log(`Legacy value read average: ${average.toFixed(3)}ms`);
      
      expect(average).toBeLessThan(1);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors without significant performance impact', () => {
      const mockGetItem = jest.spyOn(Storage.prototype, 'getItem');
      let errorCount = 0;
      
      // Make getItem fail 50% of the time
      mockGetItem.mockImplementation((_key) => {
        if (errorCount++ % 2 === 0) {
          throw new Error('Simulated storage error');
        }
        return null;
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const times: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        StorageService.get('error-test', 'default');
        const end = performance.now();
        times.push(end - start);
      }
      
      const average = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Error handling average: ${average.toFixed(3)}ms`);
      
      expect(average).toBeLessThan(2);
      
      mockGetItem.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('Storage Size Performance', () => {
    it('should calculate storage size efficiently', () => {
      // Populate with various data
      for (let i = 0; i < 50; i++) {
        StorageService.set(`size-test-${i}`, {
          data: 'x'.repeat(100),
          index: i,
        });
      }
      
      const times: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        StorageService.getSize();
        const end = performance.now();
        times.push(end - start);
      }
      
      const average = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`Storage size calculation: ${average.toFixed(3)}ms`);
      
      expect(average).toBeLessThan(5);
    });
  });

  afterEach(() => {
    localStorage.clear();
  });
});