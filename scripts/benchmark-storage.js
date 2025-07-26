#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Storage Performance Benchmark Runner
 *
 * Run with: npm run benchmark:storage
 */

const { runStoragePerformanceBenchmarks } = require('../dist/services/__tests__/StoragePerformance.bench');

console.log('🚀 Virgil Storage Performance Benchmarks\n');
console.log('This will measure the performance of storage operations...\n');

runStoragePerformanceBenchmarks()
  .then(() => {
    console.log('\n✅ Benchmarks completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  });
