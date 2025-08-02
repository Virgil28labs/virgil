#!/usr/bin/env node

/**
 * Script to help migrate media queries to standardized breakpoints
 * Finds all CSS files with old media query patterns and lists them
 */

import { glob } from 'glob';
import fs from 'fs/promises';
// Removed unused import

// Breakpoint mappings
const breakpointMappings = [
  { old: /@media\s*\(\s*max-width:\s*320px\s*\)/g, new: '@media (--xs-down)' },
  { old: /@media\s*\(\s*max-width:\s*479px\s*\)/g, new: '@media (--xs-down)' },
  { old: /@media\s*\(\s*max-width:\s*480px\s*\)/g, new: '@media (--sm-down)' },
  { old: /@media\s*\(\s*max-width:\s*767px\s*\)/g, new: '@media (--sm-down)' },
  { old: /@media\s*\(\s*max-width:\s*768px\s*\)/g, new: '@media (--md-down)' },
  { old: /@media\s*\(\s*max-width:\s*1023px\s*\)/g, new: '@media (--md-down)' },
  { old: /@media\s*\(\s*max-width:\s*1024px\s*\)/g, new: '@media (--lg-down)' },
  { old: /@media\s*\(\s*max-width:\s*1199px\s*\)/g, new: '@media (--lg-down)' },
  { old: /@media\s*\(\s*max-width:\s*1200px\s*\)/g, new: '@media (--xl-down)' },
  { old: /@media\s*\(\s*max-width:\s*1279px\s*\)/g, new: '@media (--xl-down)' },
  { old: /@media\s*\(\s*max-width:\s*1280px\s*\)/g, new: '@media (--xl-down)' },
  { old: /@media\s*\(\s*max-width:\s*1535px\s*\)/g, new: '@media (--xl-down)' },
  
  // Min-width queries
  { old: /@media\s*\(\s*min-width:\s*320px\s*\)/g, new: '@media (--xs-up)' },
  { old: /@media\s*\(\s*min-width:\s*480px\s*\)/g, new: '@media (--sm-up)' },
  { old: /@media\s*\(\s*min-width:\s*768px\s*\)/g, new: '@media (--md-up)' },
  { old: /@media\s*\(\s*min-width:\s*1024px\s*\)/g, new: '@media (--lg-up)' },
  { old: /@media\s*\(\s*min-width:\s*1280px\s*\)/g, new: '@media (--xl-up)' },
  { old: /@media\s*\(\s*min-width:\s*1536px\s*\)/g, new: '@media (--2xl-up)' },
  
  // Range queries
  { old: /@media\s*\(\s*min-width:\s*769px\s*\)\s*and\s*\(\s*max-width:\s*1024px\s*\)/g, new: '@media (--lg-only)' },
  { old: /@media\s*\(\s*min-width:\s*768px\s*\)\s*and\s*\(\s*max-width:\s*1023px\s*\)/g, new: '@media (--md-only)' },
  { old: /@media\s*\(\s*min-width:\s*480px\s*\)\s*and\s*\(\s*max-width:\s*767px\s*\)/g, new: '@media (--sm-only)' },
];

async function analyzeFile(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  const issues = [];
  
  for (const mapping of breakpointMappings) {
    const matches = content.match(mapping.old);
    if (matches) {
      issues.push({
        pattern: matches[0],
        suggestion: mapping.new,
        count: matches.length,
      });
    }
  }
  
  // Check for non-standard breakpoints
  const nonStandardRegex = /@media\s*\(\s*(max|min)-width:\s*(\d+)px\s*\)/g;
  const nonStandardMatches = [...content.matchAll(nonStandardRegex)];
  
  for (const match of nonStandardMatches) {
    const pixels = parseInt(match[2]);
    const direction = match[1];
    
    // Skip if already covered by standard mappings
    const standardPixels = [
      320, 479, 480, 767, 768, 1023, 1024, 1199, 1200, 1279, 1280, 1535, 1536,
    ];
    if (!standardPixels.includes(pixels)) {
      issues.push({
        pattern: match[0],
        suggestion: 'Consider using closest standard breakpoint',
        nonStandard: true,
        pixels,
        direction,
      });
    }
  }
  
  return issues.length > 0 ? { filePath, issues } : null;
}

async function main() {
  // eslint-disable-next-line no-console
  console.log('🔍 Scanning for media queries to migrate...\n');
  
  const cssFiles = await glob('src/**/*.css', { ignore: ['**/node_modules/**'] });
  const results = [];
  
  for (const file of cssFiles) {
    const result = await analyzeFile(file);
    if (result) {
      results.push(result);
    }
  }
  
  if (results.length === 0) {
    // eslint-disable-next-line no-console
    console.log('✅ All media queries are using standardized breakpoints!');
    return;
  }
  
  // eslint-disable-next-line no-console
  console.log(`Found ${results.length} files with media queries to migrate:\n`);
  
  for (const { filePath, issues } of results) {
    // eslint-disable-next-line no-console
    console.log(`📄 ${filePath}`);
    for (const issue of issues) {
      if (issue.nonStandard) {
        // eslint-disable-next-line no-console
        console.log(`   ⚠️  ${issue.pattern} (${issue.pixels}px ${issue.direction}-width)`);
        // eslint-disable-next-line no-console
        console.log(`      → ${issue.suggestion}`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`   • ${issue.pattern} (${issue.count} occurrence${issue.count > 1 ? 's' : ''})`);
        // eslint-disable-next-line no-console
        console.log(`     → ${issue.suggestion}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log('');
  }
  
  // eslint-disable-next-line no-console
  console.log('\n📋 Migration Summary:');
  // eslint-disable-next-line no-console
  console.log(`Total files to update: ${results.length}`);
  // eslint-disable-next-line no-console
  console.log(`Total patterns to replace: ${results.reduce((sum, r) => sum + r.issues.length, 0)}`);
  
  // eslint-disable-next-line no-console
  console.log('\n💡 Next steps:');
  // eslint-disable-next-line no-console
  console.log('1. Update each file to use the standardized breakpoints');
  // eslint-disable-next-line no-console
  console.log('2. Import breakpoints.css if needed: @import "../styles/breakpoints.css";');
  // eslint-disable-next-line no-console
  console.log('3. Test responsive behavior after migration');
  // eslint-disable-next-line no-console
  console.log('4. Consider using mobile-first approach with min-width queries');
}

main().catch(console.error);