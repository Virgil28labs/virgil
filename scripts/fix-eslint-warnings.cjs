#!/usr/bin/env node

const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Common type replacements for any types
const typeReplacements = {
  // Mock and test types
  'jest.fn().mockResolvedValue(': 'jest.fn<any, any>().mockResolvedValue(',
  'jest.fn().mockRejectedValue(': 'jest.fn<any, any>().mockRejectedValue(',
  'as any': 'as unknown',
  ': any': ': unknown',
  '<any>': '<unknown>',
  'any[]': 'unknown[]',
  'Array<any>': 'Array<unknown>',
  // Event types
  'e: any': 'e: React.MouseEvent | React.KeyboardEvent | Event',
  'event: any': 'event: Event',
  // Common patterns
  'data: any': 'data: unknown',
  'error: any': 'error: Error | unknown',
  'value: any': 'value: unknown',
  'result: any': 'result: unknown',
};

// Non-null assertion replacements
const nonNullReplacements = {
  // Optional chaining
  '.parentElement!': '.parentElement',
  '.querySelector(': '?.querySelector(',
  '.getElementById(': '?.getElementById(',
  // Type guards
  'expect(': 'expect(',
  '!.': '?.',
};

async function processFile(filePath) {
  try {
    let content = await fs.readFile(filePath, 'utf-8');
    let modified = false;

    // Apply type replacements
    for (const [search, replace] of Object.entries(typeReplacements)) {
      if (content.includes(search)) {
        content = content.replace(new RegExp(escapeRegExp(search), 'g'), replace);
        modified = true;
      }
    }

    // Apply non-null replacements more carefully
    for (const [search, replace] of Object.entries(nonNullReplacements)) {
      if (content.includes(search) && !search.includes('expect')) {
        content = content.replace(new RegExp(escapeRegExp(search), 'g'), replace);
        modified = true;
      }
    }

    // Fix specific patterns
    // Replace any in function parameters
    content = content.replace(/\(([^)]*): any([,)])/g, '($1: unknown$2');
    
    // Replace any in type assertions
    content = content.replace(/as any([^a-zA-Z])/g, 'as unknown$1');
    
    // Fix non-null assertions after optional chaining
    content = content.replace(/\?\.[^!]+!/g, (match) => match.replace(/!$/, ''));

    if (modified) {
      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getAllTestFiles() {
  const { stdout } = await execAsync('find . -name "*.test.*" -o -name "*.spec.*" | grep -E "(ts|tsx|js)$" | grep -v node_modules | grep -v dist | grep -v coverage');
  return stdout.trim().split('\n').filter(Boolean);
}

async function main() {
  console.log('🔧 Starting ESLint warning fixes...\n');

  const testFiles = await getAllTestFiles();
  console.log(`Found ${testFiles.length} test files to process\n`);

  let fixedCount = 0;
  
  for (const file of testFiles) {
    const result = await processFile(file);
    if (result) fixedCount++;
  }

  console.log(`\n✨ Fixed ${fixedCount} files`);

  // Run ESLint to check remaining warnings
  console.log('\n🔍 Running ESLint to check remaining warnings...\n');
  try {
    const { stdout } = await execAsync('npm run lint 2>&1', { maxBuffer: 10 * 1024 * 1024 });
    console.log(stdout);
  } catch (error) {
    // ESLint exits with error code if there are warnings
    if (error.stdout) {
      const warningCount = (error.stdout.match(/warning/g) || []).length;
      console.log(`\n⚠️  ${warningCount} warnings remaining`);
    }
  }
}

main().catch(console.error);