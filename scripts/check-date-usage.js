#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * Audit script to check for direct Date usage in the codebase
 * Helps identify where TimeService should be used instead
 */

import { readdir, readFile } from 'fs/promises';
import { join, extname } from 'path';

const IGNORED_PATHS = [
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
  'server/node_modules',
];

const ALLOWED_FILES = [
  'TimeService.ts',
  'TimeService.test.ts',
  'DashboardContextService.ts', // Contains TimeService wrapper methods
];

const FILE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

// Patterns to detect Date usage
const DATE_PATTERNS = [
  /new\s+Date\s*\(/g,
  /Date\.now\s*\(/g,
  /Date\.parse\s*\(/g,
  /\.toISOString\s*\(/g,
  /\.toLocaleDateString\s*\(/g,
  /\.toLocaleTimeString\s*\(/g,
  /\.getTime\s*\(/g,
  /\.getFullYear\s*\(/g,
  /\.getMonth\s*\(/g,
  /\.getDate\s*\(/g,
  /\.getHours\s*\(/g,
  /\.getMinutes\s*\(/g,
  /\.getSeconds\s*\(/g,
];

let totalIssues = 0;
const results = [];

async function scanDirectory(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    // Skip ignored paths
    if (IGNORED_PATHS.some(ignored => fullPath.includes(ignored))) {
      continue;
    }

    if (entry.isDirectory()) {
      await scanDirectory(fullPath);
    } else if (entry.isFile() && FILE_EXTENSIONS.includes(extname(entry.name))) {
      await checkFile(fullPath);
    }
  }
}

async function checkFile(filePath) {
  // Skip allowed files
  if (ALLOWED_FILES.some(allowed => filePath.endsWith(allowed))) {
    return;
  }

  // Skip test files (they're allowed to use Date directly)
  if (filePath.includes('.test.') || filePath.includes('__tests__')) {
    return;
  }

  const content = await readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const fileIssues = [];

  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }

    DATE_PATTERNS.forEach(pattern => {
      const matches = line.match(pattern);
      if (matches) {
        fileIssues.push({
          line: index + 1,
          code: line.trim(),
          pattern: pattern.source,
        });
        totalIssues++;
      }
    });
  });

  if (fileIssues.length > 0) {
    results.push({
      file: filePath,
      issues: fileIssues,
    });
  }
}

// Main execution
console.log('🔍 Auditing Date usage in codebase...\n');

try {
  await scanDirectory('src');

  if (results.length === 0) {
    console.log('✅ No direct Date usage found! All time operations use TimeService.');
  } else {
    console.log(
      `⚠️  Found ${totalIssues} instances of direct Date usage in ${results.length} files:\n`,
    );

    results.forEach(({ file, issues }) => {
      console.log(`📄 ${file}`);
      issues.forEach(({ line, code, pattern }) => {
        console.log(`   Line ${line}: ${code}`);
        console.log(`   Pattern: ${pattern}\n`);
      });
    });

    console.log('\n💡 Recommendation: Replace with TimeService methods:');
    console.log('   - new Date() → timeService.getCurrentDateTime()');
    console.log('   - Date.now() → timeService.getTimestamp()');
    console.log('   - date.toLocaleDateString() → timeService.formatDate(date)');
    console.log('   - For other methods, consider adding them to TimeService\n');
    console.log('📚 See src/services/TimeService.md for complete guide');

    // Exit with error code if running in CI or pre-commit
    if (process.env.CI || process.argv.includes('--strict')) {
      process.exit(1);
    }
  }
} catch (error) {
  console.error('❌ Error during audit:', error.message);
  process.exit(1);
}
