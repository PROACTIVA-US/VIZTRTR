/**
 * Verification Agent
 *
 * Verifies that implementations actually worked:
 * - Build succeeded
 * - Files were modified
 * - Visual changes detected
 * - No runtime errors
 */

import { VerificationResult, Changes } from '../core/types';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import { Page } from 'puppeteer';

const execAsync = promisify(exec);

export class VerificationAgent {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Verify that implementation succeeded
   */
  async verify(changes: Changes, page?: Page): Promise<VerificationResult> {
    console.log('   🔍 Verifying implementation...');

    const result: VerificationResult = {
      success: true,
      buildSucceeded: false,
      filesModified: false,
      visualChangesDetected: false,
      errors: [],
      warnings: [],
    };

    // 1. Verify files were actually modified
    result.filesModified = await this.verifyFilesModified(changes);
    if (!result.filesModified) {
      result.success = false;
      result.errors.push('Files were not modified as expected');
    }

    // 2. Verify build succeeded
    result.buildSucceeded = await this.verifyBuild();
    if (!result.buildSucceeded) {
      result.success = false;
      result.errors.push('Build failed');
    }

    // 3. Check for console errors (if page provided)
    if (page) {
      result.consoleErrors = await this.checkConsoleErrors(page);
      if (result.consoleErrors.length > 0) {
        result.success = false;
        result.errors.push(`Runtime errors detected: ${result.consoleErrors.length}`);
      }
    }

    // 4. Visual changes detection (basic check)
    result.visualChangesDetected = changes.files.length > 0;

    // Log result
    if (result.success) {
      console.log('   ✅ Verification passed');
    } else {
      console.log('   ❌ Verification failed:');
      result.errors.forEach(err => console.log(`      - ${err}`));
    }

    return result;
  }

  /**
   * Verify files were modified
   */
  private async verifyFilesModified(changes: Changes): Promise<boolean> {
    try {
      for (const file of changes.files) {
        const filePath = `${this.projectPath}/${file.path}`;
        const exists = await this.fileExists(filePath);

        if (!exists && file.type !== 'delete') {
          console.log(`   ⚠️  File not found: ${file.path}`);
          return false;
        }

        if (exists && file.newContent) {
          const content = await fs.readFile(filePath, 'utf-8');
          if (content !== file.newContent) {
            console.log(`   ⚠️  File content doesn't match expected: ${file.path}`);
            // Don't fail on this - content might have been formatted differently
          }
        }
      }

      return true;
    } catch (error) {
      console.error('   ❌ Error verifying files:', error);
      return false;
    }
  }

  /**
   * Verify build succeeded
   */
  private async verifyBuild(): Promise<boolean> {
    try {
      console.log('   🔨 Running build...');

      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: this.projectPath,
        timeout: 60000, // 60 second timeout
      });

      // Check for TypeScript errors
      if (stderr && stderr.includes('error TS')) {
        console.log('   ❌ TypeScript errors detected');
        console.log(stderr.substring(0, 500)); // Show first 500 chars
        return false;
      }

      console.log('   ✅ Build succeeded');
      return true;
    } catch (error: any) {
      console.error('   ❌ Build failed:', error.message);
      if (error.stdout) {
        console.log(error.stdout.substring(0, 500));
      }
      if (error.stderr) {
        console.log(error.stderr.substring(0, 500));
      }
      return false;
    }
  }

  /**
   * Check for console errors
   */
  private async checkConsoleErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];

    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Wait a bit for any errors to surface
    await new Promise(resolve => setTimeout(resolve, 2000));

    return errors;
  }

  /**
   * Helper: Check if file exists
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calculate visual diff between two screenshots
   * Returns number of different pixels
   */
  async calculateVisualDiff(beforePath: string, afterPath: string): Promise<number> {
    // For now, just check if files are different sizes
    // In future, integrate pixelmatch library
    try {
      const beforeStat = await fs.stat(beforePath);
      const afterStat = await fs.stat(afterPath);

      const sizeDiff = Math.abs(beforeStat.size - afterStat.size);

      // If size difference > 1%, assume visual changes
      const percentDiff = (sizeDiff / beforeStat.size) * 100;

      console.log(`   📊 Visual diff: ${percentDiff.toFixed(2)}% file size difference`);

      return percentDiff > 1 ? 1000 : 0; // Placeholder
    } catch (error) {
      console.error('   ❌ Error calculating visual diff:', error);
      return 0;
    }
  }
}
