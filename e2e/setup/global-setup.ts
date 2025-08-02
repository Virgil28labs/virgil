/**
 * Playwright Global Setup
 * 
 * Performs setup tasks that run once before all tests,
 * such as starting services and preparing test environment.
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test global setup...');
  
  try {
    // Launch browser for setup tasks
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Verify the application is running
    const baseURL = config.webServer?.url || 'http://localhost:3000';
    console.log(`📡 Checking application at ${baseURL}...`);
    
    try {
      await page.goto(baseURL, { waitUntil: 'networkidle', timeout: 30000 });
      console.log('✅ Application is running and accessible');
    } catch (error) {
      console.error('❌ Application is not accessible:', error);
      throw new Error(`Application at ${baseURL} is not responding`);
    }
    
    // Verify critical pages load
    const criticalPages = ['/', '/login', '/dashboard', '/chat'];
    
    for (const route of criticalPages) {
      try {
        const response = await page.goto(`${baseURL}${route}`, { 
          waitUntil: 'domcontentloaded',
          timeout: 10000 
        });
        
        if (response?.status() !== 200) {
          console.warn(`⚠️  Page ${route} returned status ${response?.status()}`);
        } else {
          console.log(`✅ Page ${route} loads successfully`);
        }
      } catch (error) {
        console.warn(`⚠️  Could not verify page ${route}:`, error);
      }
    }
    
    // Clean up test data from previous runs
    await page.evaluate(() => {
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            if (db.name && db.name.includes('test')) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }
    });
    
    console.log('🧹 Cleaned up test data from previous runs');
    
    // Close browser
    await browser.close();
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;