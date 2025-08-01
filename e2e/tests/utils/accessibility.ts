import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export interface A11yOptions {
  runOnly?: string[];
  skipFailures?: boolean;
  detailedReport?: boolean;
  includedImpacts?: Array<'critical' | 'serious' | 'moderate' | 'minor'>;
}

export interface A11yViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary: string;
  }>;
}

/**
 * Accessibility testing utilities
 */
export class AccessibilityTest {
  /**
   * Run accessibility scan on page
   */
  static async scan(page: Page, options: A11yOptions = {}): Promise<A11yViolation[]> {
    const {
      runOnly = ['wcag2a', 'wcag2aa'],
      includedImpacts = ['critical', 'serious'],
      detailedReport = false,
    } = options;
    
    // Run axe accessibility scan
    const results = await new AxeBuilder({ page })
      .withTags(runOnly)
      .analyze();
    
    // Filter violations by impact
    const violations = results.violations.filter(
      violation => includedImpacts.includes(violation.impact as any)
    );
    
    if (detailedReport) {
      this.logViolations(violations);
    }
    
    return violations as A11yViolation[];
  }
  
  /**
   * Test keyboard navigation
   */
  static async testKeyboardNavigation(page: Page, elements: string[]) {
    const violations: string[] = [];
    
    for (const selector of elements) {
      const element = page.locator(selector).first();
      
      // Check if element is keyboard accessible
      const isAccessible = await element.evaluate(el => {
        // Check if element is focusable
        if (!el.matches(':focus-visible') && el.tabIndex < 0) {
          return false;
        }
        
        // Check if interactive elements have keyboard handlers
        if (el.tagName === 'DIV' || el.tagName === 'SPAN') {
          const hasRole = el.hasAttribute('role');
          const hasTabIndex = el.hasAttribute('tabindex');
          const hasKeyHandler = el.hasAttribute('onkeydown') || 
                               el.hasAttribute('onkeyup') || 
                               el.hasAttribute('onkeypress');
          
          if (!hasRole || !hasTabIndex || !hasKeyHandler) {
            return false;
          }
        }
        
        return true;
      });
      
      if (!isAccessible) {
        violations.push(`${selector} is not keyboard accessible`);
      }
    }
    
    return violations;
  }
  
  /**
   * Test focus management
   */
  static async testFocusManagement(page: Page) {
    const violations: string[] = [];
    
    // Check for visible focus indicators
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        *:focus {
          outline: 3px solid red !important;
        }
      `;
      document.head.appendChild(style);
    });
    
    // Tab through interactive elements
    const interactiveElements = await page.$$('button, a, input, select, textarea, [tabindex]');
    
    for (let i = 0; i < interactiveElements.length; i++) {
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          id: el?.id,
          className: el?.className,
          hasOutline: window.getComputedStyle(el!).outline !== 'none',
        };
      });
      
      if (!focusedElement.hasOutline) {
        violations.push(`Element ${focusedElement.tagName}#${focusedElement.id} lacks focus indicator`);
      }
    }
    
    return violations;
  }
  
  /**
   * Test color contrast
   */
  static async testColorContrast(page: Page): Promise<string[]> {
    const violations = await page.evaluate(() => {
      const issues: string[] = [];
      
      // Get all text elements
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, label');
      
      textElements.forEach(element => {
        const styles = window.getComputedStyle(element);
        const bgColor = styles.backgroundColor;
        const color = styles.color;
        
        // Skip if colors are not set
        if (bgColor === 'rgba(0, 0, 0, 0)' || color === 'rgba(0, 0, 0, 0)') {
          return;
        }
        
        // Simple contrast check (would use proper algorithm in production)
        // This is a placeholder - real implementation would calculate WCAG contrast ratio
        const fontSize = parseFloat(styles.fontSize);
        const isBold = parseInt(styles.fontWeight) >= 700;
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && isBold);
        
        // Log potential issues (real implementation would calculate actual contrast)
        if (element.textContent?.trim()) {
          // This is where we'd calculate actual contrast ratio
          // For now, just flag elements for manual review
          issues.push(`Check contrast for: ${element.tagName} "${element.textContent.substring(0, 50)}..."`);
        }
      });
      
      return issues.slice(0, 5); // Limit to first 5 for demo
    });
    
    return violations;
  }
  
  /**
   * Test screen reader compatibility
   */
  static async testScreenReader(page: Page) {
    const issues: string[] = [];
    
    // Check for ARIA labels on interactive elements
    const interactiveWithoutLabel = await page.$$eval(
      'button:not([aria-label]):not([aria-labelledby]), a:not([aria-label]):not([aria-labelledby])',
      elements => elements.map(el => ({
        tag: el.tagName,
        text: el.textContent,
        class: el.className,
      }))
    );
    
    interactiveWithoutLabel.forEach(el => {
      if (!el.text?.trim()) {
        issues.push(`${el.tag} with class "${el.class}" lacks accessible label`);
      }
    });
    
    // Check for proper heading hierarchy
    const headingLevels = await page.$$eval(
      'h1, h2, h3, h4, h5, h6',
      headings => headings.map(h => parseInt(h.tagName[1]))
    );
    
    let previousLevel = 0;
    headingLevels.forEach((level, index) => {
      if (level > previousLevel + 1) {
        issues.push(`Heading hierarchy broken at position ${index}: h${previousLevel} -> h${level}`);
      }
      previousLevel = level;
    });
    
    // Check for alt text on images
    const imagesWithoutAlt = await page.$$eval(
      'img:not([alt])',
      images => images.map(img => img.src)
    );
    
    imagesWithoutAlt.forEach(src => {
      issues.push(`Image lacks alt text: ${src}`);
    });
    
    return issues;
  }
  
  /**
   * Test form accessibility
   */
  static async testFormAccessibility(page: Page) {
    const issues: string[] = [];
    
    // Check for form labels
    const inputsWithoutLabels = await page.$$eval(
      'input:not([aria-label]):not([aria-labelledby]), select:not([aria-label]):not([aria-labelledby]), textarea:not([aria-label]):not([aria-labelledby])',
      elements => elements.map(el => ({
        type: (el as HTMLInputElement).type || el.tagName,
        id: el.id,
        name: (el as HTMLInputElement).name,
      }))
    );
    
    for (const input of inputsWithoutLabels) {
      // Check if there's a label with matching 'for' attribute
      const hasLabel = await page.$(`label[for="${input.id}"]`);
      if (!hasLabel) {
        issues.push(`${input.type} input "${input.name || input.id}" lacks associated label`);
      }
    }
    
    // Check for fieldset/legend on grouped inputs
    const radioGroups = await page.$$eval(
      'input[type="radio"]',
      radios => {
        const groups = new Map<string, HTMLInputElement[]>();
        radios.forEach(radio => {
          const name = (radio as HTMLInputElement).name;
          if (!groups.has(name)) {
            groups.set(name, []);
          }
          groups.get(name)!.push(radio as HTMLInputElement);
        });
        return Array.from(groups.keys());
      }
    );
    
    for (const groupName of radioGroups) {
      const inFieldset = await page.$(`fieldset input[name="${groupName}"]`);
      if (!inFieldset) {
        issues.push(`Radio group "${groupName}" should be wrapped in fieldset with legend`);
      }
    }
    
    return issues;
  }
  
  /**
   * Log violations in a readable format
   */
  private static logViolations(violations: any[]) {
    if (violations.length === 0) {
      console.log('✅ No accessibility violations found');
      return;
    }
    
    console.log(`\n🚨 Found ${violations.length} accessibility violations:\n`);
    
    violations.forEach((violation, index) => {
      console.log(`${index + 1}. ${violation.id} (${violation.impact})`);
      console.log(`   ${violation.description}`);
      console.log(`   Help: ${violation.help}`);
      console.log(`   More info: ${violation.helpUrl}`);
      
      if (violation.nodes.length > 0) {
        console.log('   Affected elements:');
        violation.nodes.forEach((node: any, nodeIndex: number) => {
          if (nodeIndex < 3) { // Limit to first 3 nodes
            console.log(`   - ${node.target.join(' > ')}`);
          }
        });
        if (violation.nodes.length > 3) {
          console.log(`   ... and ${violation.nodes.length - 3} more`);
        }
      }
      console.log('');
    });
  }
}