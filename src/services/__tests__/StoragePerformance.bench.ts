 
/**
 * Storage Performance Benchmarks
 * 
 * Measures performance of storage operations to validate optimizations
 */

import { StorageService } from '../StorageService';
import { indexedDBService } from '../IndexedDBService';
import { storageMonitor } from '../StorageMonitor';

interface BenchmarkResult {
  operation: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  iterations: number;
}

class StoragePerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  /**
   * Run a benchmark test
   */
  private async runBenchmark(
    name: string,
    fn: () => Promise<void> | void,
    iterations = 1000,
  ): Promise<BenchmarkResult> {
    const times: number[] = [];
    
    // Warm up
    for (let i = 0; i < 10; i++) {
      await fn();
    }
    
    // Run benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }
    
    const result: BenchmarkResult = {
      operation: name,
      averageTime: times.reduce((a, b) => a + b, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      iterations,
    };
    
    this.results.push(result);
    return result;
  }

  /**
   * Benchmark localStorage operations
   */
  async benchmarkLocalStorage() {
    console.log('🚀 Benchmarking localStorage operations...\n');

    // String operations
    await this.runBenchmark('StorageService.set (string)', () => {
      StorageService.set('bench-string', 'test value');
    });

    await this.runBenchmark('StorageService.get (string)', () => {
      StorageService.get('bench-string', '');
    });

    // Number operations
    await this.runBenchmark('StorageService.set (number)', () => {
      StorageService.set('bench-number', 42.5);
    });

    await this.runBenchmark('StorageService.get (number)', () => {
      StorageService.get('bench-number', 0);
    });

    // Object operations
    const testObject = {
      id: 'test-123',
      name: 'Test Object',
      data: Array(10).fill({ value: 'test' }),
      nested: { level1: { level2: { level3: 'deep' } } },
    };

    await this.runBenchmark('StorageService.set (object)', () => {
      StorageService.set('bench-object', testObject);
    });

    await this.runBenchmark('StorageService.get (object)', () => {
      StorageService.get('bench-object', {});
    });

    // Array operations
    const testArray = Array(100).fill(0).map((_, i) => ({
      id: i,
      value: `item-${i}`,
      timestamp: Date.now(),
    }));

    await this.runBenchmark('StorageService.set (large array)', () => {
      StorageService.set('bench-array', testArray);
    });

    await this.runBenchmark('StorageService.get (large array)', () => {
      StorageService.get('bench-array', []);
    });

    // Backward compatibility test
    localStorage.setItem('bench-legacy', 'plain string value');
    await this.runBenchmark('StorageService.get (legacy string)', () => {
      StorageService.get('bench-legacy', '');
    });

    // Batch operations
    await this.runBenchmark('StorageService batch write (10 items)', () => {
      for (let i = 0; i < 10; i++) {
        StorageService.set(`bench-batch-${i}`, { index: i });
      }
    });

    // Clean up
    StorageService.remove('bench-string');
    StorageService.remove('bench-number');
    StorageService.remove('bench-object');
    StorageService.remove('bench-array');
    StorageService.remove('bench-legacy');
    for (let i = 0; i < 10; i++) {
      StorageService.remove(`bench-batch-${i}`);
    }
  }

  /**
   * Benchmark IndexedDB operations
   */
  async benchmarkIndexedDB() {
    console.log('\n🗄️  Benchmarking IndexedDB operations...\n');

    // Register test database
    indexedDBService.registerDatabase({
      name: 'BenchmarkDB',
      version: 1,
      stores: [{
        name: 'testStore',
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp' },
          { name: 'category', keyPath: 'category' },
        ],
      }],
    });

    // Small object operations
    const smallObject = {
      id: 'test-1',
      data: 'Small test data',
      timestamp: Date.now(),
      category: 'test',
    };

    await this.runBenchmark('IndexedDB.add (small object)', async () => {
      await indexedDBService.delete('BenchmarkDB', 'testStore', smallObject.id);
      await indexedDBService.add('BenchmarkDB', 'testStore', smallObject);
    }, 100);

    await this.runBenchmark('IndexedDB.get (by key)', async () => {
      await indexedDBService.get('BenchmarkDB', 'testStore', 'test-1');
    }, 100);

    // Large object operations
    const largeObject = {
      id: 'test-large',
      data: Array(1000).fill('x').join(''),
      metadata: Array(50).fill(0).map((_, i) => ({
        index: i,
        value: `metadata-${i}`,
        nested: { data: Array(10).fill('nested') },
      })),
      timestamp: Date.now(),
      category: 'large',
    };

    await this.runBenchmark('IndexedDB.put (large object)', async () => {
      await indexedDBService.put('BenchmarkDB', 'testStore', largeObject);
    }, 100);

    // Batch operations
    const batchData = Array(50).fill(0).map((_, i) => ({
      id: `batch-${i}`,
      data: `Batch item ${i}`,
      timestamp: Date.now() + i,
      category: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C',
    }));

    await this.runBenchmark('IndexedDB.add (batch 50 items)', async () => {
      for (const item of batchData) {
        await indexedDBService.add('BenchmarkDB', 'testStore', item);
      }
    }, 10);

    await this.runBenchmark('IndexedDB.getAll', async () => {
      await indexedDBService.getAll('BenchmarkDB', 'testStore');
    }, 100);

    await this.runBenchmark('IndexedDB.query (by index)', async () => {
      await indexedDBService.query('BenchmarkDB', 'testStore', 'category', 'A');
    }, 100);

    // Clean up
    await indexedDBService.clear('BenchmarkDB', 'testStore');
    await indexedDBService.deleteDatabase('BenchmarkDB');
  }

  /**
   * Benchmark storage monitoring operations
   */
  async benchmarkMonitoring() {
    console.log('\n📊 Benchmarking storage monitoring...\n');

    await this.runBenchmark('StorageMonitor.getMetrics', async () => {
      await storageMonitor.getMetrics();
    }, 100);

    await this.runBenchmark('StorageMonitor.checkHealth', async () => {
      await storageMonitor.checkHealth();
    }, 100);

    await this.runBenchmark('StorageMonitor.getCleanupSuggestions', async () => {
      await storageMonitor.getCleanupSuggestions();
    }, 100);
  }

  /**
   * Print benchmark results
   */
  printResults() {
    console.log('\n📈 Performance Benchmark Results\n');
    console.log('='.repeat(80));
    
    // Group results by category
    const categories = {
      'localStorage': this.results.filter(r => r.operation.includes('StorageService')),
      'IndexedDB': this.results.filter(r => r.operation.includes('IndexedDB')),
      'Monitoring': this.results.filter(r => r.operation.includes('StorageMonitor')),
    };

    Object.entries(categories).forEach(([category, results]) => {
      if (results.length === 0) return;
      
      console.log(`\n${category} Operations:`);
      console.log('-'.repeat(80));
      console.log('Operation'.padEnd(50) + 'Avg (ms)'.padEnd(12) + 'Min (ms)'.padEnd(12) + 'Max (ms)'.padEnd(12));
      console.log('-'.repeat(80));
      
      results.forEach(result => {
        console.log(
          result.operation.padEnd(50) +
          result.averageTime.toFixed(3).padEnd(12) +
          result.minTime.toFixed(3).padEnd(12) +
          result.maxTime.toFixed(3).padEnd(12),
        );
      });
    });

    console.log('\n' + '='.repeat(80));
    
    // Performance targets validation
    console.log('\n✅ Performance Target Validation:\n');
    
    const localStorageReads = this.results.filter(r => r.operation.includes('StorageService.get'));
    const localStorageWrites = this.results.filter(r => r.operation.includes('StorageService.set'));
    const indexedDBReads = this.results.filter(r => r.operation.includes('IndexedDB.get'));
    const indexedDBWrites = this.results.filter(r => r.operation.includes('IndexedDB.add') || r.operation.includes('IndexedDB.put'));
    
    const avgLocalStorageRead = localStorageReads.reduce((sum, r) => sum + r.averageTime, 0) / localStorageReads.length;
    const avgLocalStorageWrite = localStorageWrites.reduce((sum, r) => sum + r.averageTime, 0) / localStorageWrites.length;
    const avgIndexedDBRead = indexedDBReads.reduce((sum, r) => sum + r.averageTime, 0) / indexedDBReads.length;
    const avgIndexedDBWrite = indexedDBWrites.reduce((sum, r) => sum + r.averageTime, 0) / indexedDBWrites.length;
    
    console.log(`localStorage read average: ${avgLocalStorageRead.toFixed(3)}ms (target: <1ms) ${avgLocalStorageRead < 1 ? '✅' : '❌'}`);
    console.log(`localStorage write average: ${avgLocalStorageWrite.toFixed(3)}ms (target: <2ms) ${avgLocalStorageWrite < 2 ? '✅' : '❌'}`);
    console.log(`IndexedDB read average: ${avgIndexedDBRead.toFixed(3)}ms (target: <10ms) ${avgIndexedDBRead < 10 ? '✅' : '❌'}`);
    console.log(`IndexedDB write average: ${avgIndexedDBWrite.toFixed(3)}ms (target: <20ms) ${avgIndexedDBWrite < 20 ? '✅' : '❌'}`);
  }
}

// Export benchmark runner
export async function runStoragePerformanceBenchmarks() {
  const benchmark = new StoragePerformanceBenchmark();
  
  try {
    await benchmark.benchmarkLocalStorage();
    await benchmark.benchmarkIndexedDB();
    await benchmark.benchmarkMonitoring();
    benchmark.printResults();
  } catch (error) {
    console.error('Benchmark failed:', error);
  }
}

// Run benchmarks if this file is executed directly
if (require.main === module) {
  runStoragePerformanceBenchmarks();
}