/**
 * Code Change Validation System
 *
 * Prevents over-engineering by enforcing surgical, incremental changes
 */

import { InterfaceValidationAgent, CrossFileValidationResult } from '../agents/InterfaceValidationAgent';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  originalLines: number;
  modifiedLines: number;
  lineDelta: number;
  lineGrowthPercent: number;
  exportsChanged: boolean;
  importsChanged: boolean;
  violations: string[];
}

export interface ChangeConstraints {
  maxLineDelta: number;
  maxGrowthPercent: number; // e.g., 0.5 = 50% max growth
  preserveExports: boolean;
  preserveImports: boolean;
  requireDiffFormat: boolean;
  effortBasedLineLimits?: {
    low: number; // effort 1-2
    medium: number; // effort 3-4
    high: number; // effort 5+
  };
}

const DEFAULT_CONSTRAINTS: ChangeConstraints = {
  maxLineDelta: 100,
  maxGrowthPercent: 0.5, // 50% max growth
  preserveExports: true,
  preserveImports: true,
  requireDiffFormat: false,
  effortBasedLineLimits: {
    low: 20,
    medium: 50,
    high: 100,
  },
};

/**
 * Validate file changes against scope constraints
 */
export function validateFileChanges(
  original: string,
  modified: string,
  constraints: Partial<ChangeConstraints> = {},
  effortScore?: number
): ValidationResult {
  const config = { ...DEFAULT_CONSTRAINTS, ...constraints };
  const violations: string[] = [];

  // Count lines
  const originalLines = countLines(original);
  const modifiedLines = countLines(modified);
  const lineDelta = Math.abs(modifiedLines - originalLines);
  const lineGrowthPercent = originalLines > 0 ? (modifiedLines - originalLines) / originalLines : 0;

  // Check file size constraints
  if (lineDelta > config.maxLineDelta) {
    violations.push(
      `Line delta (${lineDelta}) exceeds maximum (${config.maxLineDelta}). ` +
      `Changed ${lineDelta} lines, but should change at most ${config.maxLineDelta} lines.`
    );
  }

  if (lineGrowthPercent > config.maxGrowthPercent) {
    violations.push(
      `File grew by ${(lineGrowthPercent * 100).toFixed(1)}%, exceeds maximum ${(config.maxGrowthPercent * 100).toFixed(0)}%. ` +
      `Original: ${originalLines} lines, Modified: ${modifiedLines} lines.`
    );
  }

  // Effort-based constraints
  if (effortScore && config.effortBasedLineLimits) {
    let maxLinesForEffort: number;

    if (effortScore <= 2) {
      maxLinesForEffort = config.effortBasedLineLimits.low;
    } else if (effortScore <= 4) {
      maxLinesForEffort = config.effortBasedLineLimits.medium;
    } else {
      maxLinesForEffort = config.effortBasedLineLimits.high;
    }

    if (lineDelta > maxLinesForEffort) {
      violations.push(
        `Effort score ${effortScore} allows max ${maxLinesForEffort} lines changed, but ${lineDelta} lines were changed. ` +
        `Make more targeted changes.`
      );
    }
  }

  // Check export preservation
  let exportsChanged = false;
  if (config.preserveExports) {
    const originalExports = extractExports(original);
    const modifiedExports = extractExports(modified);
    exportsChanged = !arraysEqual(originalExports, modifiedExports);

    if (exportsChanged) {
      violations.push(
        `Export statements changed. Original exports: [${originalExports.join(', ')}], ` +
        `Modified exports: [${modifiedExports.join(', ')}]. Export signatures must be preserved.`
      );
    }
  }

  // Check import preservation
  let importsChanged = false;
  if (config.preserveImports) {
    const originalImports = extractImports(original);
    const modifiedImports = extractImports(modified);

    // Check if imports were removed
    const removedImports = originalImports.filter(imp => !modifiedImports.includes(imp));
    if (removedImports.length > 0) {
      violations.push(
        `Import statements removed: ${removedImports.join(', ')}. ` +
        `Verify these imports are no longer used before removing.`
      );
      importsChanged = true;
    }
  }

  return {
    valid: violations.length === 0,
    reason: violations.length > 0 ? violations.join(' | ') : undefined,
    originalLines,
    modifiedLines,
    lineDelta,
    lineGrowthPercent,
    exportsChanged,
    importsChanged,
    violations,
  };
}

/**
 * Check export statement consistency
 */
export function checkExportConsistency(original: string, modified: string): boolean {
  const originalExports = extractExports(original);
  const modifiedExports = extractExports(modified);
  return arraysEqual(originalExports, modifiedExports);
}

/**
 * Check if line delta is within acceptable range
 */
export function checkLineDelta(original: string, modified: string, maxDelta: number): boolean {
  const originalLines = countLines(original);
  const modifiedLines = countLines(modified);
  return Math.abs(modifiedLines - originalLines) <= maxDelta;
}

/**
 * Extract export statements from code
 */
export function extractExports(code: string): string[] {
  const exports: string[] = [];

  // Match different export patterns
  const patterns = [
    /export\s+default\s+(?:class|function|const|let|var)\s+(\w+)/g,
    /export\s+default\s+(\w+)/g,
    /export\s+\{([^}]+)\}/g,
    /export\s+(?:const|let|var|function|class)\s+(\w+)/g,
  ];

  for (const pattern of patterns) {
    const matches = code.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        // Handle export { a, b, c } syntax
        if (match[0].includes('{')) {
          const exportList = match[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0].trim());
          exports.push(...exportList);
        } else {
          exports.push(match[1].trim());
        }
      }
    }
  }

  // Deduplicate and sort
  return [...new Set(exports)].sort();
}

/**
 * Extract import statements from code
 */
export function extractImports(code: string): string[] {
  const imports: string[] = [];

  // Match import statements
  const importPattern = /import\s+(?:(?:\{[^}]+\}|\w+|\*\s+as\s+\w+)(?:\s*,\s*(?:\{[^}]+\}|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;

  const matches = code.matchAll(importPattern);
  for (const match of matches) {
    if (match[1]) {
      imports.push(match[1]);
    }
  }

  return imports.sort();
}

/**
 * Count non-empty, non-comment lines
 */
function countLines(code: string): number {
  const lines = code.split('\n');
  let count = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Track block comments
    if (trimmed.includes('/*')) inBlockComment = true;
    if (trimmed.includes('*/')) {
      inBlockComment = false;
      continue;
    }

    // Skip empty lines, single-line comments, and lines inside block comments
    if (!trimmed || trimmed.startsWith('//') || inBlockComment) {
      continue;
    }

    count++;
  }

  return count;
}

/**
 * Compare two arrays for equality
 */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;

  const sortedA = [...a].sort();
  const sortedB = [...b].sort();

  return sortedA.every((val, idx) => val === sortedB[idx]);
}

/**
 * Get effort-based max line limit
 */
export function getEffortBasedLimit(effortScore: number, constraints?: ChangeConstraints): number {
  const limits = constraints?.effortBasedLineLimits || DEFAULT_CONSTRAINTS.effortBasedLineLimits!;

  if (effortScore <= 2) return limits.low;
  if (effortScore <= 4) return limits.medium;
  return limits.high;
}

/**
 * Create a validation summary for logging
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines = [
    `Validation: ${result.valid ? '✅ PASSED' : '❌ FAILED'}`,
    `  Lines: ${result.originalLines} → ${result.modifiedLines} (Δ${result.lineDelta})`,
    `  Growth: ${(result.lineGrowthPercent * 100).toFixed(1)}%`,
  ];

  if (result.exportsChanged) {
    lines.push(`  ⚠️  Exports modified`);
  }

  if (result.importsChanged) {
    lines.push(`  ⚠️  Imports modified`);
  }

  if (result.violations.length > 0) {
    lines.push(`  Violations:`);
    result.violations.forEach(v => lines.push(`    - ${v}`));
  }

  return lines.join('\n');
}

/**
 * Validate cross-file interface compatibility
 *
 * Uses InterfaceValidationAgent to detect breaking changes that would
 * affect dependent files (e.g., removed props, changed exports)
 */
export async function validateCrossFileInterfaces(
  filePath: string,
  originalCode: string,
  modifiedCode: string,
  projectPath: string,
  anthropicApiKey: string
): Promise<CrossFileValidationResult> {
  const agent = new InterfaceValidationAgent(anthropicApiKey);

  try {
    const result = await agent.validateInterfaceChange(
      filePath,
      originalCode,
      modifiedCode,
      projectPath
    );

    return result;
  } catch (error) {
    console.warn(`Warning: Cross-file validation failed:`, error);

    // Return permissive result on error (don't block changes)
    return {
      valid: true,
      breakingChanges: [],
      affectedFiles: [],
      suggestions: [`Cross-file validation failed: ${error}. Proceeding with caution.`],
    };
  }
}

/**
 * Format cross-file validation results for logging
 */
export function formatCrossFileValidationResult(result: CrossFileValidationResult): string {
  const lines = [
    `Cross-File Validation: ${result.valid ? '✅ PASSED' : '❌ FAILED'}`,
    `  Affected Files: ${result.affectedFiles.length}`,
  ];

  if (result.breakingChanges.length > 0) {
    lines.push(`  Breaking Changes:`);
    result.breakingChanges.forEach(change => {
      const icon = change.impact === 'high' ? '🔴' : change.impact === 'medium' ? '🟡' : '🟢';
      lines.push(`    ${icon} [${change.type}] ${change.description}`);
      lines.push(`       Before: ${change.before}`);
      lines.push(`       After:  ${change.after}`);
    });
  }

  if (result.suggestions.length > 0) {
    lines.push(`  Suggestions:`);
    result.suggestions.forEach(s => lines.push(`    💡 ${s}`));
  }

  return lines.join('\n');
}
