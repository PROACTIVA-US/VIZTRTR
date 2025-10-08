/**
 * Micro-Change Toolkit
 *
 * Provides constrained tools that force surgical, atomic changes to code.
 * This prevents AI agents from rewriting entire files and ensures traceable,
 * minimal modifications.
 *
 * Architecture:
 * - Each tool performs exactly ONE atomic change
 * - Changes are validated before execution
 * - All modifications are logged and reversible
 * - Tools work at the line/selector level, not file level
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface MicroChangeResult {
  success: boolean;
  filePath: string;
  lineNumber?: number;
  changeType: string;
  before: string;
  after: string;
  error?: string;
}

export interface ClassNameChange {
  filePath: string;
  lineNumber: number;
  oldClassName: string;
  newClassName: string;
}

export interface StyleValueChange {
  filePath: string;
  lineNumber: number;
  property: string;
  oldValue: string;
  newValue: string;
}

export interface TextContentChange {
  filePath: string;
  lineNumber: number;
  oldText: string;
  newText: string;
}

export class MicroChangeToolkit {
  private projectPath: string;
  private changeLog: MicroChangeResult[] = [];

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Update a single className in a React component
   *
   * Example:
   * - Before: <div className="text-sm py-2">
   * - After:  <div className="text-base py-2">
   */
  async updateClassName(change: ClassNameChange): Promise<MicroChangeResult> {
    const { filePath, lineNumber, oldClassName, newClassName } = change;
    const absolutePath = path.resolve(this.projectPath, filePath);

    try {
      // Read file
      const content = await fs.readFile(absolutePath, 'utf-8');
      const lines = content.split('\n');

      // Validate line number
      if (lineNumber < 1 || lineNumber > lines.length) {
        return {
          success: false,
          filePath,
          lineNumber,
          changeType: 'className',
          before: '',
          after: '',
          error: `Invalid line number: ${lineNumber} (file has ${lines.length} lines)`,
        };
      }

      const targetLine = lines[lineNumber - 1];

      // Validate oldClassName exists on this line
      if (!targetLine.includes(oldClassName)) {
        return {
          success: false,
          filePath,
          lineNumber,
          changeType: 'className',
          before: targetLine,
          after: targetLine,
          error: `className "${oldClassName}" not found on line ${lineNumber}`,
        };
      }

      // Perform atomic replacement
      const newLine = targetLine.replace(oldClassName, newClassName);

      // Verify change is atomic (only one occurrence changed)
      const occurrences = (targetLine.match(new RegExp(oldClassName, 'g')) || []).length;
      if (occurrences > 1) {
        return {
          success: false,
          filePath,
          lineNumber,
          changeType: 'className',
          before: targetLine,
          after: newLine,
          error: `Multiple occurrences of "${oldClassName}" on line ${lineNumber}. Be more specific.`,
        };
      }

      // Apply change
      lines[lineNumber - 1] = newLine;
      await fs.writeFile(absolutePath, lines.join('\n'), 'utf-8');

      const result: MicroChangeResult = {
        success: true,
        filePath,
        lineNumber,
        changeType: 'className',
        before: targetLine,
        after: newLine,
      };

      this.changeLog.push(result);
      return result;
    } catch (error) {
      return {
        success: false,
        filePath,
        lineNumber,
        changeType: 'className',
        before: '',
        after: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update a single CSS property value
   *
   * Example:
   * - Before: fontSize: '14px'
   * - After:  fontSize: '16px'
   */
  async updateStyleValue(change: StyleValueChange): Promise<MicroChangeResult> {
    const { filePath, lineNumber, property, oldValue, newValue } = change;
    const absolutePath = path.resolve(this.projectPath, filePath);

    try {
      // Read file
      const content = await fs.readFile(absolutePath, 'utf-8');
      const lines = content.split('\n');

      // Validate line number
      if (lineNumber < 1 || lineNumber > lines.length) {
        return {
          success: false,
          filePath,
          lineNumber,
          changeType: 'styleValue',
          before: '',
          after: '',
          error: `Invalid line number: ${lineNumber} (file has ${lines.length} lines)`,
        };
      }

      const targetLine = lines[lineNumber - 1];

      // Build regex pattern for property: value
      // Matches: property: 'value', property: "value", or property: value
      const patterns = [`${property}:\\s*['"]${oldValue}['"]`, `${property}:\\s*${oldValue}`];

      let matchFound = false;
      let newLine = targetLine;

      for (const pattern of patterns) {
        const regex = new RegExp(pattern);
        if (regex.test(targetLine)) {
          // Build replacement maintaining quote style
          const quoteMatch = targetLine.match(new RegExp(`${property}:\\s*(['"])`));
          const quote = quoteMatch ? quoteMatch[1] : '';
          const replacement = quote
            ? `${property}: ${quote}${newValue}${quote}`
            : `${property}: ${newValue}`;

          newLine = targetLine.replace(regex, replacement);
          matchFound = true;
          break;
        }
      }

      if (!matchFound) {
        return {
          success: false,
          filePath,
          lineNumber,
          changeType: 'styleValue',
          before: targetLine,
          after: targetLine,
          error: `Property "${property}: ${oldValue}" not found on line ${lineNumber}`,
        };
      }

      // Apply change
      lines[lineNumber - 1] = newLine;
      await fs.writeFile(absolutePath, lines.join('\n'), 'utf-8');

      const result: MicroChangeResult = {
        success: true,
        filePath,
        lineNumber,
        changeType: 'styleValue',
        before: targetLine,
        after: newLine,
      };

      this.changeLog.push(result);
      return result;
    } catch (error) {
      return {
        success: false,
        filePath,
        lineNumber,
        changeType: 'styleValue',
        before: '',
        after: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update text content within an element
   *
   * Example:
   * - Before: <h1>Old Title</h1>
   * - After:  <h1>New Title</h1>
   */
  async updateTextContent(change: TextContentChange): Promise<MicroChangeResult> {
    const { filePath, lineNumber, oldText, newText } = change;
    const absolutePath = path.resolve(this.projectPath, filePath);

    try {
      // Read file
      const content = await fs.readFile(absolutePath, 'utf-8');
      const lines = content.split('\n');

      // Validate line number
      if (lineNumber < 1 || lineNumber > lines.length) {
        return {
          success: false,
          filePath,
          lineNumber,
          changeType: 'textContent',
          before: '',
          after: '',
          error: `Invalid line number: ${lineNumber} (file has ${lines.length} lines)`,
        };
      }

      const targetLine = lines[lineNumber - 1];

      // Validate oldText exists on this line
      if (!targetLine.includes(oldText)) {
        return {
          success: false,
          filePath,
          lineNumber,
          changeType: 'textContent',
          before: targetLine,
          after: targetLine,
          error: `Text "${oldText}" not found on line ${lineNumber}`,
        };
      }

      // Perform atomic replacement
      const newLine = targetLine.replace(oldText, newText);

      // Verify change is atomic (only one occurrence changed)
      const occurrences = (
        targetLine.match(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []
      ).length;
      if (occurrences > 1) {
        return {
          success: false,
          filePath,
          lineNumber,
          changeType: 'textContent',
          before: targetLine,
          after: newLine,
          error: `Multiple occurrences of "${oldText}" on line ${lineNumber}. Be more specific.`,
        };
      }

      // Apply change
      lines[lineNumber - 1] = newLine;
      await fs.writeFile(absolutePath, lines.join('\n'), 'utf-8');

      const result: MicroChangeResult = {
        success: true,
        filePath,
        lineNumber,
        changeType: 'textContent',
        before: targetLine,
        after: newLine,
      };

      this.changeLog.push(result);
      return result;
    } catch (error) {
      return {
        success: false,
        filePath,
        lineNumber,
        changeType: 'textContent',
        before: '',
        after: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the change log (all modifications made)
   */
  getChangeLog(): MicroChangeResult[] {
    return [...this.changeLog];
  }

  /**
   * Clear the change log
   */
  clearChangeLog(): void {
    this.changeLog = [];
  }

  /**
   * Get statistics about changes
   */
  getStats(): {
    totalChanges: number;
    successfulChanges: number;
    failedChanges: number;
    changesByType: Record<string, number>;
  } {
    const successful = this.changeLog.filter(c => c.success).length;
    const failed = this.changeLog.filter(c => !c.success).length;

    const byType: Record<string, number> = {};
    this.changeLog.forEach(change => {
      byType[change.changeType] = (byType[change.changeType] || 0) + 1;
    });

    return {
      totalChanges: this.changeLog.length,
      successfulChanges: successful,
      failedChanges: failed,
      changesByType: byType,
    };
  }
}
