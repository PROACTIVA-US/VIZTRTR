/**
 * Grep Helper Utility
 *
 * Simplified file search utility for finding patterns in codebases
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface GrepMatch {
  file: string;
  line: number;
  content: string;
}

export interface GrepOptions {
  filePattern: string;
  ignoreCase: boolean;
  maxDepth?: number;
}

export class Grep {
  constructor(private basePath: string) {}

  async search(pattern: string, options: GrepOptions): Promise<GrepMatch[]> {
    const results: GrepMatch[] = [];

    try {
      const files = await this.findFiles(options.filePattern, options.maxDepth);

      for (const file of files) {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');

        const regex = new RegExp(pattern, options.ignoreCase ? 'i' : '');

        lines.forEach((line, index) => {
          if (regex.test(line)) {
            results.push({ file, line: index + 1, content: line });
          }
        });
      }
    } catch (error) {
      // Silently fail - grep is best-effort
    }

    return results;
  }

  private async findFiles(pattern: string, maxDepth: number = 10): Promise<string[]> {
    const files: string[] = [];

    async function walkDir(dir: string, depth: number = 0): Promise<void> {
      if (depth > maxDepth) return;

      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules, .git, and other common ignore patterns
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'dist' ||
          entry.name === 'build' ||
          entry.name.startsWith('.')
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          await walkDir(fullPath, depth + 1);
        } else if (entry.isFile()) {
          // Simple glob matching
          if (matchesPattern(entry.name, pattern)) {
            files.push(fullPath);
          }
        }
      }
    }

    await walkDir(this.basePath);
    return files;
  }
}

/**
 * Simple glob pattern matching
 */
function matchesPattern(filename: string, pattern: string): boolean {
  // Convert glob pattern to regex
  // **/*.ts -> match any .ts file
  // *.tsx -> match any .tsx file
  // **/*.{ts,tsx} -> match .ts or .tsx files

  if (pattern === '**/*') return true;

  // Handle {ext1,ext2} syntax
  const braceMatch = pattern.match(/\{([^}]+)\}/);
  if (braceMatch) {
    const extensions = braceMatch[1].split(',');
    return extensions.some(ext => filename.endsWith(ext.trim()));
  }

  // Handle simple *.ext pattern
  if (pattern.startsWith('*.')) {
    return filename.endsWith(pattern.slice(1));
  }

  // Handle **/*.ext pattern
  if (pattern.startsWith('**/*.')) {
    return filename.endsWith(pattern.slice(4));
  }

  // Exact match
  return filename === pattern;
}
