#!/usr/bin/env node

/**
 * Script to clean up excessive whitespace in TypeScript/JavaScript files
 * Preserves:
 * - Single blank lines between logical sections
 * - Blank lines after imports
 * - Blank lines before exports
 * Removes:
 * - Multiple consecutive blank lines (reduces to 1)
 * - Trailing whitespace
 * - Blank lines at start/end of files
 */

import fs from 'fs';
import { glob } from 'glob';

// Configuration
const PATTERNS = [
  'src/**/*.{ts,tsx,js,jsx}',
  'server/**/*.{ts,js}',
  'scripts/**/*.js',
  'tests/**/*.{ts,tsx,js,jsx}',
];

const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
];

/**
 * Clean up whitespace in a file
 * @param {string} content - File content
 * @returns {string} - Cleaned content
 */
function cleanupWhitespace(content) {
  // Split into lines
  let lines = content.split('\n');

  // Remove trailing whitespace from each line
  lines = lines.map(line => line.trimEnd());

  // Remove leading and trailing blank lines
  while (lines.length > 0 && lines[0] === '') {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  // Reduce multiple consecutive blank lines to single blank line
  const cleanedLines = [];
  let previousWasBlank = false;

  for (const line of lines) {
    const isBlank = line === '';

    if (isBlank && previousWasBlank) {
      // Skip additional blank lines
      continue;
    }

    cleanedLines.push(line);
    previousWasBlank = isBlank;
  }

  // Ensure file ends with a newline
  return cleanedLines.join('\n') + '\n';
}

/**
 * Process a single file
 * @param {string} filePath - Path to file
 * @returns {Object} - Results of processing
 */
function processFile(filePath) {
  try {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    const cleanedContent = cleanupWhitespace(originalContent);

    if (originalContent !== cleanedContent) {
      fs.writeFileSync(filePath, cleanedContent, 'utf8');

      const originalLines = originalContent.split('\n').length;
      const cleanedLines = cleanedContent.split('\n').length;
      const removedLines = originalLines - cleanedLines;

      return {
        path: filePath,
        success: true,
        modified: true,
        originalLines,
        cleanedLines,
        removedLines,
      };
    }

    return {
      path: filePath,
      success: true,
      modified: false,
    };
  } catch (error) {
    return {
      path: filePath,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Main function
 */
async function main() {
  // eslint-disable-next-line no-console
  console.log('🧹 Starting whitespace cleanup...\n');

  // Find all files matching patterns
  const files = [];
  for (const pattern of PATTERNS) {
    const matches = await glob(pattern, { ignore: EXCLUDE_PATTERNS });
    files.push(...matches);
  }

  // Remove duplicates
  const uniqueFiles = [...new Set(files)];

  // eslint-disable-next-line no-console
  console.log(`Found ${uniqueFiles.length} files to process\n`);

  // Process files
  let totalModified = 0;
  let totalRemoved = 0;
  let errors = 0;

  for (const file of uniqueFiles) {
    const result = processFile(file);

    if (!result.success) {
      console.error(`❌ Error processing ${file}: ${result.error}`);
      errors++;
    } else if (result.modified) {
      // eslint-disable-next-line no-console
      console.log(`✅ Cleaned ${file} (removed ${result.removedLines} lines)`);
      totalModified++;
      totalRemoved += result.removedLines;
    }
  }

  // Summary
  // eslint-disable-next-line no-console
  console.log('\n📊 Summary:');
  // eslint-disable-next-line no-console
  console.log(`- Files processed: ${uniqueFiles.length}`);
  // eslint-disable-next-line no-console
  console.log(`- Files modified: ${totalModified}`);
  // eslint-disable-next-line no-console
  console.log(`- Total lines removed: ${totalRemoved}`);
  // eslint-disable-next-line no-console
  console.log(`- Errors: ${errors}`);

  if (errors > 0) {
    process.exit(1);
  }
}

// Run if called directly
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { cleanupWhitespace, processFile };
