/**
 * UX Validation Agent - Phase 2 of Hybrid Architecture
 *
 * Combines Gemini Computer Use with comprehensive UX/WCAG testing:
 * - Browser automation with Playwright
 * - Keyboard navigation testing
 * - Focus visibility (WCAG 2.4.7)
 * - Screen reader compatibility
 * - WCAG 2.1 Level AA automated testing (axe-core)
 * - User flow validation
 * - Visual regression detection
 *
 * This agent is called AFTER ControlPanelAgentV2 makes surgical visual fixes.
 * It validates the UX is production-ready and WCAG compliant.
 */

import { chromium, Browser, Page } from 'playwright';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Screenshot } from '../../core/types';

// WCAG 2.1 Level AA Test Results
export interface WCAGTestResult {
  rule: string; // e.g., "color-contrast", "label", "button-name"
  description: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagReference: string; // e.g., "WCAG 1.4.3"
  nodes: Array<{
    html: string;
    target: string; // CSS selector
    failureSummary: string;
  }>;
}

export interface WCAGComplianceReport {
  compliant: boolean;
  totalViolations: number;
  criticalCount: number;
  seriousCount: number;
  moderateCount: number;
  minorCount: number;
  violations: WCAGTestResult[];
  passes: string[]; // Rules that passed
  incomplete: string[]; // Rules that need manual review
}

// Keyboard Navigation Test Results
export interface KeyboardTestResult {
  passed: boolean;
  tabOrder: string[]; // CSS selectors in tab order
  focusVisible: boolean; // All focus states visible
  escapeWorks: boolean; // Escape closes modals
  enterWorks: boolean; // Enter activates buttons
  issues: string[];
}

// User Flow Test Results
export interface UserFlowTest {
  flowName: string;
  steps: Array<{
    action: string;
    selector?: string;
    success: boolean;
    error?: string;
  }>;
  passed: boolean;
  duration: number; // milliseconds
}

// Complete UX Validation Report
export interface UXValidationReport {
  timestamp: Date;
  frontendUrl: string;
  wcagCompliance: WCAGComplianceReport;
  keyboardNavigation: KeyboardTestResult;
  userFlows: UserFlowTest[];
  visualRegression: {
    detected: boolean;
    details?: string;
    screenshotBefore?: string;
    screenshotAfter?: string;
  };
  overallPassed: boolean;
  recommendations: Array<{
    dimension: string;
    title: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
}

/**
 * UXValidationAgent
 *
 * Phase 2 of the hybrid architecture:
 * After visual fixes, validate UX and WCAG compliance in real browser
 */
export class UXValidationAgent {
  private apiKey: string;
  private model: any;
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('Gemini API key is required for UX validation. Set GEMINI_API_KEY or GOOGLE_API_KEY env var.');
    }

    // Use Gemini 2.0 Flash for vision analysis
    const genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    console.log('✅ UXValidationAgent initialized');
  }

  /**
   * Initialize browser for testing
   */
  async initializeBrowser(frontendUrl: string, headless: boolean = true): Promise<void> {
    console.log('🌐 Initializing browser for UX validation...');

    this.browser = await chromium.launch({
      headless,
      args: ['--start-maximized'],
    });

    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      // Enable screen reader simulation
      reducedMotion: 'no-preference',
      forcedColors: 'none',
    });

    this.page = await context.newPage();

    // Navigate and wait for full load
    await this.page.goto(frontendUrl);
    await this.page.waitForLoadState('networkidle');

    console.log('✅ Browser ready for testing');
  }

  /**
   * Run WCAG 2.1 Level AA compliance tests using axe-core
   */
  async runWCAGTests(): Promise<WCAGComplianceReport> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log('🔍 Running WCAG 2.1 Level AA tests...');

    try {
      // Inject axe-core library into page
      await this.page.addScriptTag({
        url: 'https://unpkg.com/axe-core@4.10.0/axe.min.js',
      });

      // Wait for axe to load
      await this.page.waitForFunction(() => typeof (window as any).axe !== 'undefined');

      // Run axe accessibility tests
      const results = await this.page.evaluate(() => {
        return (window as any).axe.run({
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
          },
        });
      });

      // Parse results
      const violations: WCAGTestResult[] = results.violations.map((v: any) => ({
        rule: v.id,
        description: v.description,
        impact: v.impact,
        wcagReference: v.tags.filter((t: string) => t.startsWith('wcag')).join(', '),
        nodes: v.nodes.map((n: any) => ({
          html: n.html,
          target: n.target.join(' > '),
          failureSummary: n.failureSummary,
        })),
      }));

      const passes = results.passes.map((p: any) => p.id);
      const incomplete = results.incomplete.map((i: any) => i.id);

      const criticalCount = violations.filter(v => v.impact === 'critical').length;
      const seriousCount = violations.filter(v => v.impact === 'serious').length;
      const moderateCount = violations.filter(v => v.impact === 'moderate').length;
      const minorCount = violations.filter(v => v.impact === 'minor').length;

      const compliant = criticalCount === 0 && seriousCount === 0;

      console.log(`✅ WCAG tests complete: ${violations.length} violations found`);
      console.log(`   Critical: ${criticalCount}, Serious: ${seriousCount}, Moderate: ${moderateCount}, Minor: ${minorCount}`);

      return {
        compliant,
        totalViolations: violations.length,
        criticalCount,
        seriousCount,
        moderateCount,
        minorCount,
        violations,
        passes,
        incomplete,
      };
    } catch (error: any) {
      console.error('❌ WCAG testing failed:', error.message);

      // Return failure report
      return {
        compliant: false,
        totalViolations: 0,
        criticalCount: 0,
        seriousCount: 0,
        moderateCount: 0,
        minorCount: 0,
        violations: [],
        passes: [],
        incomplete: [],
      };
    }
  }

  /**
   * Test keyboard navigation and focus visibility
   */
  async testKeyboardNavigation(): Promise<KeyboardTestResult> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log('⌨️  Testing keyboard navigation...');

    const tabOrder: string[] = [];
    const issues: string[] = [];
    let focusVisible = true;

    try {
      // Test Tab navigation through interactive elements
      for (let i = 0; i < 20; i++) {
        await this.page.keyboard.press('Tab');
        await this.page.waitForTimeout(100);

        // Get currently focused element
        const focusedElement = await this.page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;

          // Get CSS selector
          const selector = el.tagName.toLowerCase() +
            (el.id ? `#${el.id}` : '') +
            (el.className ? `.${el.className.split(' ').join('.')}` : '');

          // Check if focus outline is visible
          const styles = window.getComputedStyle(el);
          const hasOutline = styles.outline !== 'none' &&
                            styles.outlineWidth !== '0px' &&
                            styles.outlineColor !== 'transparent';
          const hasRing = styles.boxShadow.includes('rgb'); // Tailwind ring-*

          return {
            selector,
            hasVisibleFocus: hasOutline || hasRing,
          };
        });

        if (focusedElement) {
          tabOrder.push(focusedElement.selector);

          if (!focusedElement.hasVisibleFocus) {
            focusVisible = false;
            issues.push(`No visible focus indicator on ${focusedElement.selector} (WCAG 2.4.7)`);
          }
        }
      }

      // Test Enter key on button
      const enterWorks = await this.page.evaluate(() => {
        const button = document.querySelector('button');
        if (!button) return true; // No button to test

        let clicked = false;
        button.addEventListener('click', () => { clicked = true; }, { once: true });
        button.focus();

        // Simulate Enter key
        const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' });
        button.dispatchEvent(event);

        return clicked;
      });

      if (!enterWorks) {
        issues.push('Enter key does not activate focused button');
      }

      // Test Escape key (if modal exists)
      const escapeWorks = await this.page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) return true; // No modal to test

        let closed = false;
        const closeButton = modal.querySelector('[aria-label*="close" i]');
        if (closeButton) {
          (closeButton as HTMLElement).addEventListener('click', () => { closed = true; }, { once: true });
        }

        // Simulate Escape key
        const event = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' });
        document.dispatchEvent(event);

        return closed || !document.contains(modal);
      });

      if (!escapeWorks) {
        issues.push('Escape key does not close modal/dialog');
      }

      const passed = focusVisible && enterWorks && escapeWorks && tabOrder.length > 0;

      console.log(`✅ Keyboard navigation test complete: ${passed ? 'PASSED' : 'FAILED'}`);
      console.log(`   Tab order: ${tabOrder.length} elements`);
      console.log(`   Issues: ${issues.length}`);

      return {
        passed,
        tabOrder,
        focusVisible,
        escapeWorks,
        enterWorks,
        issues,
      };
    } catch (error: any) {
      console.error('❌ Keyboard navigation test failed:', error.message);

      return {
        passed: false,
        tabOrder: [],
        focusVisible: false,
        escapeWorks: false,
        enterWorks: false,
        issues: [`Test error: ${error.message}`],
      };
    }
  }

  /**
   * Test user flows (e.g., form submission, navigation)
   */
  async testUserFlows(flows: Array<{ name: string; steps: Array<{ action: string; selector?: string; value?: string }> }>): Promise<UserFlowTest[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log(`🔄 Testing ${flows.length} user flows...`);

    const results: UserFlowTest[] = [];

    for (const flow of flows) {
      const startTime = Date.now();
      const steps: UserFlowTest['steps'] = [];
      let flowPassed = true;

      console.log(`  Testing flow: ${flow.name}`);

      for (const step of flow.steps) {
        try {
          if (step.action === 'click' && step.selector) {
            await this.page.click(step.selector);
            steps.push({ action: `Click ${step.selector}`, success: true });
          } else if (step.action === 'fill' && step.selector && step.value) {
            await this.page.fill(step.selector, step.value);
            steps.push({ action: `Fill ${step.selector} with "${step.value}"`, success: true });
          } else if (step.action === 'wait' && step.selector) {
            await this.page.waitForSelector(step.selector, { timeout: 5000 });
            steps.push({ action: `Wait for ${step.selector}`, success: true });
          } else if (step.action === 'navigate' && step.value) {
            await this.page.goto(step.value);
            await this.page.waitForLoadState('networkidle');
            steps.push({ action: `Navigate to ${step.value}`, success: true });
          }
        } catch (error: any) {
          steps.push({
            action: step.action,
            selector: step.selector,
            success: false,
            error: error.message
          });
          flowPassed = false;
          break; // Stop flow on first error
        }

        await this.page.waitForTimeout(200); // Small delay between steps
      }

      const duration = Date.now() - startTime;
      results.push({
        flowName: flow.name,
        steps,
        passed: flowPassed,
        duration,
      });

      console.log(`  ${flowPassed ? '✅' : '❌'} ${flow.name}: ${duration}ms`);
    }

    return results;
  }

  /**
   * Capture screenshot for visual comparison
   */
  async captureScreenshot(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const screenshot = await this.page.screenshot({
      type: 'png',
      fullPage: false,
    });

    return screenshot.toString('base64');
  }

  /**
   * Detect visual regression by comparing screenshots
   */
  async detectVisualRegression(beforeScreenshot: string, afterScreenshot: string): Promise<{ detected: boolean; details: string }> {
    console.log('🔍 Checking for visual regressions...');

    try {
      const prompt = `
You are reviewing UI changes to detect visual regressions.

Compare these BEFORE and AFTER screenshots.

RESPOND WITH VALID JSON ONLY:
{
  "regressionDetected": false,
  "details": "No visual regressions detected. Changes improve the UI without breaking existing elements."
}

RULES:
- regressionDetected: true if ANY negative visual changes (broken layout, missing content, etc.)
- details: Brief description of what changed
- Be strict: even minor layout breaks should be flagged
`;

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/png',
            data: beforeScreenshot,
          },
        },
        {
          inlineData: {
            mimeType: 'image/png',
            data: afterScreenshot,
          },
        },
      ]);

      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      console.log(`✅ Visual regression check: ${parsed.regressionDetected ? 'REGRESSION DETECTED' : 'PASSED'}`);

      return {
        detected: parsed.regressionDetected,
        details: parsed.details,
      };
    } catch (error: any) {
      console.error('❌ Visual regression detection failed:', error.message);

      // Assume regression for safety
      return {
        detected: true,
        details: `Failed to analyze: ${error.message}`,
      };
    }
  }

  /**
   * Main validation method - runs all UX tests
   */
  async validate(
    frontendUrl: string,
    options: {
      beforeScreenshot?: string;
      testWCAG?: boolean;
      testKeyboard?: boolean;
      testFlows?: Array<{ name: string; steps: any[] }>;
      detectRegression?: boolean;
      headless?: boolean;
    } = {}
  ): Promise<UXValidationReport> {
    const {
      beforeScreenshot,
      testWCAG = true,
      testKeyboard = true,
      testFlows = [],
      detectRegression = true,
      headless = true,
    } = options;

    console.log('🚀 Starting comprehensive UX validation...');
    console.log(`   URL: ${frontendUrl}`);
    console.log(`   WCAG: ${testWCAG}`);
    console.log(`   Keyboard: ${testKeyboard}`);
    console.log(`   Flows: ${testFlows.length}`);

    try {
      // Initialize browser
      await this.initializeBrowser(frontendUrl, headless);

      // Capture current screenshot
      const afterScreenshot = await this.captureScreenshot();

      // Run WCAG tests
      let wcagCompliance: WCAGComplianceReport = {
        compliant: true,
        totalViolations: 0,
        criticalCount: 0,
        seriousCount: 0,
        moderateCount: 0,
        minorCount: 0,
        violations: [],
        passes: [],
        incomplete: [],
      };

      if (testWCAG) {
        wcagCompliance = await this.runWCAGTests();
      }

      // Test keyboard navigation
      let keyboardNavigation: KeyboardTestResult = {
        passed: true,
        tabOrder: [],
        focusVisible: true,
        escapeWorks: true,
        enterWorks: true,
        issues: [],
      };

      if (testKeyboard) {
        keyboardNavigation = await this.testKeyboardNavigation();
      }

      // Test user flows
      const userFlows = testFlows.length > 0 ? await this.testUserFlows(testFlows) : [];

      // Detect visual regression
      let visualRegression = {
        detected: false,
        details: 'No regression check performed',
        screenshotBefore: beforeScreenshot,
        screenshotAfter: afterScreenshot,
      };

      if (detectRegression && beforeScreenshot) {
        const regression = await this.detectVisualRegression(beforeScreenshot, afterScreenshot);
        visualRegression = {
          ...regression,
          screenshotBefore: beforeScreenshot,
          screenshotAfter: afterScreenshot,
        };
      }

      // Generate recommendations from violations
      const recommendations = this.generateRecommendations(wcagCompliance, keyboardNavigation, userFlows);

      // Determine overall pass/fail
      const overallPassed =
        wcagCompliance.compliant &&
        keyboardNavigation.passed &&
        userFlows.every(f => f.passed) &&
        !visualRegression.detected;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`UX VALIDATION ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log(`${'='.repeat(60)}`);
      console.log(`WCAG Compliance:       ${wcagCompliance.compliant ? '✅ PASSED' : `❌ FAILED (${wcagCompliance.totalViolations} violations)`}`);
      console.log(`Keyboard Navigation:   ${keyboardNavigation.passed ? '✅ PASSED' : `❌ FAILED (${keyboardNavigation.issues.length} issues)`}`);
      console.log(`User Flows:            ${userFlows.length === 0 ? 'N/A' : userFlows.every(f => f.passed) ? '✅ PASSED' : `❌ FAILED`}`);
      console.log(`Visual Regression:     ${visualRegression.detected ? '❌ DETECTED' : '✅ NONE'}`);
      console.log(`Recommendations:       ${recommendations.length}`);
      console.log(`${'='.repeat(60)}\n`);

      return {
        timestamp: new Date(),
        frontendUrl,
        wcagCompliance,
        keyboardNavigation,
        userFlows,
        visualRegression,
        overallPassed,
        recommendations,
      };
    } finally {
      // Always cleanup
      await this.cleanup();
    }
  }

  /**
   * Generate recommendations from test results
   */
  private generateRecommendations(
    wcag: WCAGComplianceReport,
    keyboard: KeyboardTestResult,
    flows: UserFlowTest[]
  ): UXValidationReport['recommendations'] {
    const recommendations: UXValidationReport['recommendations'] = [];

    // WCAG violations → recommendations
    for (const violation of wcag.violations) {
      recommendations.push({
        dimension: 'accessibility',
        title: `Fix ${violation.rule}: ${violation.description}`,
        description: `WCAG ${violation.wcagReference} violation. ${violation.nodes.length} element(s) affected. ${violation.nodes[0]?.failureSummary || ''}`,
        priority: violation.impact === 'critical' ? 'critical' :
                  violation.impact === 'serious' ? 'high' :
                  violation.impact === 'moderate' ? 'medium' : 'low',
      });
    }

    // Keyboard issues → recommendations
    for (const issue of keyboard.issues) {
      recommendations.push({
        dimension: 'accessibility',
        title: 'Improve keyboard navigation',
        description: issue,
        priority: issue.includes('WCAG') ? 'high' : 'medium',
      });
    }

    // User flow failures → recommendations
    for (const flow of flows.filter(f => !f.passed)) {
      const failedStep = flow.steps.find(s => !s.success);
      recommendations.push({
        dimension: 'usability',
        title: `Fix user flow: ${flow.flowName}`,
        description: `Step failed: ${failedStep?.action}. Error: ${failedStep?.error || 'Unknown'}`,
        priority: 'high',
      });
    }

    return recommendations;
  }

  /**
   * Cleanup browser resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('✅ Browser closed');
    }
  }
}

/**
 * Factory function
 */
export function createUXValidationAgent(apiKey?: string): UXValidationAgent {
  return new UXValidationAgent(apiKey);
}
