/**
 * Gemini Computer Use Full Plugin
 *
 * Advanced implementation plugin that combines:
 * - Browser automation with Playwright
 * - Gemini vision for planning and verification
 * - Visual feedback loop (edit → reload → verify)
 * - Automatic rollback on visual regression
 *
 * Based on patterns from /Users/danielconnolly/gemini-ui-testing/
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  VIZTRTRPlugin,
  DesignSpec,
  Changes,
  FileChange,
  ProjectContext,
  Recommendation,
} from '../core/types';

interface GeminiAction {
  type: 'edit_file' | 'verify' | 'rollback';
  filePath?: string;
  description: string;
  oldContent?: string;
  newContent?: string;
  lineNumber?: number;
  expectedVisualChange?: string;
}

interface GeminiPlan {
  steps: GeminiAction[];
  estimatedImpact: string;
  verificationCriteria: string[];
}

interface VisualComparison {
  beforeScore: number;
  afterScore: number;
  improved: boolean;
  regressionDetected: boolean;
  details: string;
}

/**
 * GeminiComputerUseFullPlugin
 *
 * Implements UI improvements with full visual verification loop:
 * 1. Analyze current UI state
 * 2. Plan code changes
 * 3. Execute file modifications
 * 4. Reload browser and capture new state
 * 5. Verify improvements visually
 * 6. Rollback if regression detected
 */
export class GeminiComputerUseFullPlugin implements VIZTRTRPlugin {
  name = 'gemini-computer-use-full';
  version = '1.0.0';
  type = 'implementation' as const;

  private apiKey: string;
  private model: any;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private backupFiles: Map<string, string> = new Map();

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

    if (!this.apiKey) {
      throw new Error('Gemini API key is required. Set GEMINI_API_KEY or GOOGLE_API_KEY env var.');
    }

    // Use Gemini 2.0 Flash for vision analysis (quota-friendly)
    const genAI = new GoogleGenerativeAI(this.apiKey);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });

    console.log('✅ Gemini Computer Use Full plugin initialized');
  }

  /**
   * Initialize browser for visual verification
   */
  async initializeBrowser(frontendUrl: string): Promise<void> {
    if (this.browser) {
      return; // Already initialized
    }

    console.log('🌐 Initializing browser for visual verification...');
    this.browser = await chromium.launch({
      headless: true, // Set to false for debugging
      args: ['--start-maximized'],
    });

    this.page = await this.browser.newPage();
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await this.page.goto(frontendUrl);
    await this.page.waitForLoadState('networkidle');
    console.log('✅ Browser ready');
  }

  /**
   * Capture screenshot for visual comparison (internal method)
   */
  private async captureScreenshotInternal(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initializeBrowser() first.');
    }

    const screenshot = await this.page.screenshot({
      type: 'png',
      fullPage: false,
    });

    return screenshot.toString('base64');
  }

  /**
   * Analyze UI visually and return score
   */
  async analyzeUIVisually(screenshot: string, context: string): Promise<number> {
    const prompt = `
Analyze this UI screenshot and rate its quality from 0-10 based on:
- Visual hierarchy and clarity
- Typography and readability
- Color contrast and accessibility
- Spacing and layout
- Component design quality

Context: ${context}

Respond with ONLY a number between 0-10 (one decimal place). Example: 7.5
`;

    const result = await this.model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: screenshot,
        },
      },
    ]);

    const scoreText = result.response.text().trim();
    const score = parseFloat(scoreText);

    if (isNaN(score) || score < 0 || score > 10) {
      console.warn(`⚠️  Invalid score from Gemini: ${scoreText}, using 5.0`);
      return 5.0;
    }

    return score;
  }

  /**
   * Generate implementation plan with file changes
   */
  async generateImplementationPlan(
    spec: DesignSpec,
    projectPath: string,
    recommendation: Recommendation
  ): Promise<GeminiPlan> {
    console.log('🤖 Gemini: Planning implementation...');

    const prompt = `
You are a senior UI/UX engineer implementing design improvements.

RECOMMENDATION:
${JSON.stringify(recommendation, null, 2)}

PROJECT CONTEXT:
- Project path: ${projectPath}
- Type: React + TypeScript frontend

TASK:
Generate a precise implementation plan to address this recommendation.

RESPOND WITH VALID JSON ONLY (no markdown, no code blocks):
{
  "steps": [
    {
      "type": "edit_file",
      "filePath": "ui/frontend/src/components/Button.tsx",
      "description": "Improve focus outline",
      "lineNumber": 42,
      "oldContent": "outline: none",
      "newContent": "outline: 2px solid #3B82F6; outline-offset: 2px",
      "expectedVisualChange": "Button will have visible blue outline on focus"
    }
  ],
  "estimatedImpact": "High - improves keyboard accessibility significantly",
  "verificationCriteria": [
    "Focus outline is visible when button is focused",
    "Outline color has sufficient contrast",
    "Outline does not overlap with button content"
  ]
}

RULES:
- Provide EXACT file paths relative to project root
- Specify EXACT line numbers
- Include old content for validation
- Keep changes minimal and surgical
- Focus on CSS/styling changes for UI improvements
`;

    const result = await this.model.generateContent(prompt);
    const responseText = result.response.text();

    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const plan: GeminiPlan = JSON.parse(jsonMatch[0]);

      if (!plan.steps || !Array.isArray(plan.steps)) {
        throw new Error('Invalid plan structure: missing steps array');
      }

      console.log(`✅ Plan generated with ${plan.steps.length} steps`);
      return plan;
    } catch (error) {
      console.error('❌ Failed to parse implementation plan:', error);
      console.error('Raw response:', responseText);

      // Return fallback plan
      return {
        steps: [],
        estimatedImpact: 'Unknown - failed to generate plan',
        verificationCriteria: [],
      };
    }
  }

  /**
   * Execute file changes with backup
   */
  async executeFileChanges(plan: GeminiPlan, projectPath: string): Promise<FileChange[]> {
    const changes: FileChange[] = [];

    for (const step of plan.steps) {
      if (step.type !== 'edit_file' || !step.filePath) {
        continue;
      }

      const fullPath = path.isAbsolute(step.filePath)
        ? step.filePath
        : path.join(projectPath, step.filePath);

      // Validate file is within project (security)
      if (!this.isPathSafe(fullPath, projectPath)) {
        console.warn(`⚠️  Skipping file outside project: ${step.filePath}`);
        continue;
      }

      try {
        // Read current content
        const oldContent = await fs.readFile(fullPath, 'utf-8');

        // Create backup
        const backupPath = `${fullPath}.backup-${Date.now()}`;
        await fs.writeFile(backupPath, oldContent);
        this.backupFiles.set(fullPath, backupPath);

        // Apply change (simple line replacement for now)
        let newContent = oldContent;
        if (step.oldContent && step.newContent) {
          newContent = oldContent.replace(step.oldContent, step.newContent);
        }

        if (newContent !== oldContent) {
          await fs.writeFile(fullPath, newContent);

          changes.push({
            path: step.filePath,
            type: 'edit',
            oldContent,
            newContent,
            diff: this.generateDiff(oldContent, newContent, step.filePath),
          });

          console.log(`✅ Modified: ${step.filePath}`);
        } else {
          console.warn(`⚠️  No changes made to ${step.filePath} - content not found`);
        }
      } catch (error: any) {
        console.error(`❌ Error modifying ${step.filePath}:`, error.message);
      }
    }

    return changes;
  }

  /**
   * Reload browser and wait for changes to take effect
   */
  async reloadAndWait(waitMs: number = 3000): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log('🔄 Reloading page to reflect changes...');
    await this.page.reload({ waitUntil: 'networkidle' });
    await this.page.waitForTimeout(waitMs); // Wait for hot reload
    console.log('✅ Page reloaded');
  }

  /**
   * Compare before/after screenshots and detect regressions
   */
  async verifyChanges(
    beforeScreenshot: string,
    afterScreenshot: string,
    expectedChanges: string[]
  ): Promise<VisualComparison> {
    console.log('🔍 Verifying visual changes...');

    const prompt = `
You are reviewing UI changes to detect improvements or regressions.

EXPECTED CHANGES:
${expectedChanges.map((c, i) => `${i + 1}. ${c}`).join('\n')}

TASK:
Compare the BEFORE and AFTER screenshots.

RESPOND WITH VALID JSON ONLY:
{
  "beforeScore": 7.2,
  "afterScore": 8.1,
  "improved": true,
  "regressionDetected": false,
  "details": "Focus outline is now visible and meets accessibility standards. No visual regressions detected."
}

RULES:
- Score from 0-10 (one decimal)
- improved: true if afterScore > beforeScore
- regressionDetected: true if any negative visual changes
- details: Brief description of changes observed
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

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in verification response');
      }

      const comparison: VisualComparison = JSON.parse(jsonMatch[0]);

      console.log(
        `✅ Verification complete: ${comparison.beforeScore} → ${comparison.afterScore}`
      );
      return comparison;
    } catch (error) {
      console.error('❌ Failed to parse verification response:', error);
      console.error('Raw response:', responseText);

      // Fallback: assume no improvement
      return {
        beforeScore: 7.0,
        afterScore: 7.0,
        improved: false,
        regressionDetected: true,
        details: 'Failed to verify changes - assuming regression for safety',
      };
    }
  }

  /**
   * Rollback changes by restoring backups
   */
  async rollback(): Promise<void> {
    console.log('⏪ Rolling back changes...');

    for (const [originalPath, backupPath] of this.backupFiles.entries()) {
      try {
        const backupContent = await fs.readFile(backupPath, 'utf-8');
        await fs.writeFile(originalPath, backupContent);
        await fs.unlink(backupPath); // Delete backup
        console.log(`✅ Restored: ${originalPath}`);
      } catch (error: any) {
        console.error(`❌ Error restoring ${originalPath}:`, error.message);
      }
    }

    this.backupFiles.clear();
    console.log('✅ Rollback complete');
  }

  /**
   * Main implementation method with full visual verification loop
   */
  async implementChanges(
    spec: DesignSpec,
    projectPath: string,
    frontendUrl?: string
  ): Promise<Changes> {
    const recommendation = spec.prioritizedChanges[0];
    if (!recommendation) {
      throw new Error('No recommendations to implement');
    }

    const url = frontendUrl || 'http://localhost:5173';

    try {
      // Step 1: Initialize browser
      await this.initializeBrowser(url);

      // Step 2: Capture "before" screenshot
      const beforeScreenshot = await this.captureScreenshotInternal();
      const beforeScore = await this.analyzeUIVisually(
        beforeScreenshot,
        'Current UI state before changes'
      );
      console.log(`📊 Before score: ${beforeScore}/10`);

      // Step 3: Generate implementation plan
      const plan = await this.generateImplementationPlan(spec, projectPath, recommendation);

      if (plan.steps.length === 0) {
        console.warn('⚠️  No implementation steps generated - skipping');
        return {
          files: [],
          summary: 'No changes generated',
          buildCommand: 'npm run build',
          testCommand: 'npm test',
        };
      }

      // Step 4: Execute file changes
      const fileChanges = await this.executeFileChanges(plan, projectPath);

      if (fileChanges.length === 0) {
        console.warn('⚠️  No files were modified - skipping verification');
        return {
          files: [],
          summary: 'No files were modified',
          buildCommand: 'npm run build',
          testCommand: 'npm test',
        };
      }

      // Step 5: Reload browser to see changes
      await this.reloadAndWait(3000);

      // Step 6: Capture "after" screenshot
      const afterScreenshot = await this.captureScreenshotInternal();

      // Step 7: Verify changes visually
      const verification = await this.verifyChanges(
        beforeScreenshot,
        afterScreenshot,
        plan.verificationCriteria
      );

      // Step 8: Rollback if regression detected
      if (verification.regressionDetected) {
        console.warn('⚠️  Visual regression detected - rolling back changes');
        await this.rollback();
        await this.reloadAndWait(2000); // Reload to original state

        return {
          files: [],
          summary: `Rollback: ${verification.details}`,
          buildCommand: 'npm run build',
          testCommand: 'npm test',
        };
      }

      // Step 9: Return successful changes
      console.log('✅ Changes verified successfully');

      return {
        files: fileChanges,
        summary: `${recommendation.title}\n\nImpact: ${plan.estimatedImpact}\n\nVerification: ${verification.details}`,
        buildCommand: 'npm run build',
        testCommand: 'npm test',
      };
    } catch (error: any) {
      console.error('❌ Implementation failed:', error.message);

      // Attempt rollback on error
      if (this.backupFiles.size > 0) {
        await this.rollback();
      }

      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('✅ Browser closed');
    }

    // Clean up any remaining backups
    for (const [, backupPath] of this.backupFiles.entries()) {
      try {
        await fs.unlink(backupPath);
      } catch {
        // Ignore errors
      }
    }
    this.backupFiles.clear();
  }

  /**
   * Security: Validate file path is within project
   */
  private isPathSafe(filePath: string, projectPath: string): boolean {
    const resolvedPath = path.resolve(filePath);
    const resolvedProjectPath = path.resolve(projectPath);

    // Must be within project directory
    if (!resolvedPath.startsWith(resolvedProjectPath)) {
      return false;
    }

    // Blacklist critical files/directories
    const blacklist = ['node_modules', '.git', '.env', 'package.json', 'package-lock.json'];
    const relativePath = path.relative(resolvedProjectPath, resolvedPath);

    for (const blocked of blacklist) {
      if (relativePath.startsWith(blocked)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate unified diff format
   */
  private generateDiff(oldContent: string, newContent: string, filePath: string): string {
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');

    let diff = `--- ${filePath}\n+++ ${filePath}\n`;

    // Simple line-by-line diff (could use a library for better diffs)
    for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];

      if (oldLine !== newLine) {
        if (oldLine !== undefined) {
          diff += `-${oldLine}\n`;
        }
        if (newLine !== undefined) {
          diff += `+${newLine}\n`;
        }
      }
    }

    return diff;
  }
}

/**
 * Factory function for creating Gemini Computer Use Full plugin
 */
export function createGeminiComputerUseFullPlugin(apiKey?: string): GeminiComputerUseFullPlugin {
  return new GeminiComputerUseFullPlugin(apiKey);
}
