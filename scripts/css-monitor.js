#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * CSS Monitoring Script
 * Tracks CSS file sizes and detects regressions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// CSS files to monitor
const cssFiles = [
  'src/App.css',
  'src/index.css',
  'src/styles/variables.css',
  'src/styles/animations.css',
];

// Size thresholds (in KB)
const thresholds = {
  'src/App.css': 150, // ~3000 lines
  'src/index.css': 15,
  'src/styles/variables.css': 5,
  'src/styles/animations.css': 10,
};

// Check CSS file sizes
function checkCSSFiles() {
  console.log('🔍 CSS File Size Report\n');
  
  let hasIssues = false;
  const results = [];
  
  cssFiles.forEach(file => {
    const filePath = path.join(projectRoot, file);
    
    if (!fs.existsSync(filePath)) {
      results.push({
        file,
        status: '❌',
        message: 'File not found',
      });
      return;
    }
    
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    const threshold = thresholds[file];
    
    if (sizeKB > threshold) {
      hasIssues = true;
      results.push({
        file,
        status: '⚠️',
        message: `${sizeKB} KB (exceeds ${threshold} KB threshold)`,
      });
    } else {
      results.push({
        file,
        status: '✅',
        message: `${sizeKB} KB`,
      });
    }
  });
  
  // Print results
  results.forEach(result => {
    console.log(`${result.status} ${result.file}: ${result.message}`);
  });
  
  // Count lines in App.css
  const appCssPath = path.join(projectRoot, 'src/App.css');
  if (fs.existsSync(appCssPath)) {
    const content = fs.readFileSync(appCssPath, 'utf8');
    const lines = content.split('\n').length;
    console.log(`\n📊 App.css line count: ${lines}`);
  }
  
  // Build size check
  const distPath = path.join(projectRoot, 'dist/assets');
  if (fs.existsSync(distPath)) {
    console.log('\n📦 Build Output:');
    
    const cssFiles = fs.readdirSync(distPath)
      .filter(file => file.endsWith('.css'))
      .map(file => {
        const stats = fs.statSync(path.join(distPath, file));
        return {
          name: file,
          size: (stats.size / 1024).toFixed(2),
        };
      })
      .sort((a, b) => parseFloat(b.size) - parseFloat(a.size));
    
    cssFiles.forEach(file => {
      console.log(`  ${file.name}: ${file.size} KB`);
    });
    
    const totalSize = cssFiles.reduce((sum, file) => sum + parseFloat(file.size), 0);
    console.log(`\n  Total CSS: ${totalSize.toFixed(2)} KB`);
  }
  
  console.log('\n' + (hasIssues ? '⚠️  Some files exceed size thresholds' : '✅ All CSS files within limits'));
  
  process.exit(hasIssues ? 1 : 0);
}

checkCSSFiles();