/**
 * Line Hint Generator
 *
 * Optimizes V2 agent performance by providing exact line hints
 * for pattern matching, reducing tool call attempts from 12 to 2-3.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface LineHint {
  lineNumber: number;
  content: string;
  pattern: string;
}

export interface GrepResult {
  filePath: string;
  matches: LineHint[];
  totalMatches: number;
}

/**
 * Search for patterns in a file and return line hints
 */
export async function grepFile(
  filePath: string,
  patterns: string | string[]
): Promise<GrepResult> {
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const matches: LineHint[] = [];

  lines.forEach((line, index) => {
    for (const pattern of patternArray) {
      if (line.includes(pattern)) {
        matches.push({
          lineNumber: index + 1, // 1-indexed
          content: line.trim(),
          pattern,
        });
      }
    }
  });

  return {
    filePath,
    matches,
    totalMatches: matches.length,
  };
}

/**
 * Search for patterns across multiple files
 */
export async function grepFiles(
  filePaths: string[],
  patterns: string | string[]
): Promise<GrepResult[]> {
  const results: GrepResult[] = [];

  for (const filePath of filePaths) {
    try {
      const result = await grepFile(filePath, patterns);
      if (result.totalMatches > 0) {
        results.push(result);
      }
    } catch {
      // Skip files that can't be read
      continue;
    }
  }

  return results;
}

/**
 * Format grep results as human-readable line hints for agent prompts
 */
export function formatLineHints(results: GrepResult[]): string {
  if (results.length === 0) {
    return 'No matches found.';
  }

  const formatted: string[] = [];

  for (const result of results) {
    formatted.push(`\n**${path.basename(result.filePath)}:**`);
    for (const match of result.matches) {
      formatted.push(`  Line ${match.lineNumber}: ${match.content}`);
    }
  }

  return formatted.join('\n');
}

/**
 * Extract className values from a line of code
 */
export function extractClassNames(line: string): string[] {
  const classNameMatches = line.match(/className="([^"]*)"/g);
  if (!classNameMatches) return [];

  return classNameMatches.map(match => {
    const value = match.match(/className="([^"]*)"/);
    return value ? value[1] : '';
  });
}

/**
 * Search for specific className patterns (e.g., text-sm, text-base)
 */
export async function findClassNames(
  filePath: string,
  classNames: string[]
): Promise<LineHint[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const matches: LineHint[] = [];

  lines.forEach((line, index) => {
    const lineClassNames = extractClassNames(line);
    for (const className of classNames) {
      if (lineClassNames.some(cn => cn.includes(className))) {
        matches.push({
          lineNumber: index + 1,
          content: line.trim(),
          pattern: className,
        });
      }
    }
  });

  return matches;
}

/**
 * Generate line hints for a specific recommendation
 *
 * Analyzes the recommendation and searches files for target patterns,
 * providing exact line numbers to reduce agent tool search attempts.
 */
export async function generateLineHintsForRecommendation(
  filePath: string,
  dimension: string,
  description: string
): Promise<string> {
  // Extract patterns from recommendation based on dimension
  const patterns: string[] = [];

  // Typography recommendations often involve className changes
  if (dimension.toLowerCase().includes('typography')) {
    // Extract className patterns from description
    const classNameMatch = description.match(/text-\w+|font-\w+|leading-\w+/g);
    if (classNameMatch) {
      patterns.push(...classNameMatch);
    }
  }

  // Color recommendations
  if (dimension.toLowerCase().includes('color')) {
    const colorMatch = description.match(/bg-\w+|text-\w+/g);
    if (colorMatch) {
      patterns.push(...colorMatch);
    }
  }

  // Spacing recommendations
  if (dimension.toLowerCase().includes('spacing') || dimension.toLowerCase().includes('layout')) {
    const spacingMatch = description.match(/p-\d+|m-\d+|gap-\d+|space-\w+/g);
    if (spacingMatch) {
      patterns.push(...spacingMatch);
    }
  }

  // If no patterns extracted, return empty hints
  if (patterns.length === 0) {
    return '';
  }

  // Search file for patterns
  const result = await grepFile(filePath, patterns);

  if (result.totalMatches === 0) {
    return '';
  }

  // Format as line hints for agent prompt
  let hints = '\n**📍 LINE HINTS (exact locations found):**\n';
  hints += `Found "${patterns.join('", "')}" in ${path.basename(filePath)}:\n`;

  for (const match of result.matches) {
    hints += `  • Line ${match.lineNumber}: ${match.content}\n`;
  }

  hints += '\n**Use these exact line numbers in your tool calls to minimize search attempts.**\n';

  return hints;
}
