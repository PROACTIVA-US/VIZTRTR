/**
 * File Discovery Utilities
 *
 * Dynamically discover files in target projects for agent modification
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface DiscoveredFile {
  path: string;           // Relative path from project root
  absolutePath: string;   // Absolute path on filesystem
  name: string;           // File name
  extension: string;      // File extension (.tsx, .ts, etc)
  sizeBytes: number;      // File size in bytes
  content?: string;       // File content (if loaded)
}

export interface FileDiscoveryOptions {
  extensions?: string[];  // File extensions to include (default: ['.tsx', '.ts', '.jsx', ''])
  maxDepth?: number;      // Maximum directory depth (default: 10)
  excludeDirs?: string[]; // Directories to exclude (default: node_modules, dist, build)
  maxFileSize?: number;   // Maximum file size in bytes (default: 100KB)
  includeContent?: boolean; // Load file contents (default: false)
}

const DEFAULT_OPTIONS: Required<FileDiscoveryOptions> = {
  extensions: ['.tsx', '.ts', '.jsx', ''],
  maxDepth: 10,
  excludeDirs: ['node_modules', 'dist', 'build', '.git', 'coverage', '.next'],
  maxFileSize: 100 * 1024, // 100KB
  includeContent: false,
};

/**
 * Discover files in a project directory
 */
export async function discoverFiles(
  projectPath: string,
  options: FileDiscoveryOptions = {}
): Promise<DiscoveredFile[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const files: DiscoveredFile[] = [];

  async function scan(dirPath: string, depth: number = 0): Promise<void> {
    if (depth > opts.maxDepth) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip excluded directories
          if (opts.excludeDirs.includes(entry.name)) continue;
          await scan(fullPath, depth + 1);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);

          // Skip if extension not in whitelist
          if (!opts.extensions.includes(ext)) continue;

          // Check file size
          const stats = await fs.stat(fullPath);
          if (stats.size > opts.maxFileSize) continue;

          // Create discovered file entry
          const relativePath = path.relative(projectPath, fullPath);
          const file: DiscoveredFile = {
            path: relativePath,
            absolutePath: fullPath,
            name: entry.name,
            extension: ext,
            sizeBytes: stats.size,
          };

          // Load content if requested
          if (opts.includeContent) {
            try {
              file.content = await fs.readFile(fullPath, 'utf-8');
            } catch (error) {
              console.warn(`Could not read file: ${fullPath}`);
            }
          }

          files.push(file);
        }
      }
    } catch (error) {
      console.warn(`Could not scan directory: ${dirPath}`, error);
    }
  }

  await scan(projectPath);
  return files;
}

/**
 * Discover React/UI component files
 */
export async function discoverComponentFiles(
  projectPath: string,
  options: FileDiscoveryOptions = {}
): Promise<DiscoveredFile[]> {
  const allFiles = await discoverFiles(projectPath, {
    ...options,
    extensions: ['.tsx', '.jsx'],
  });

  // Filter for files likely to be components
  return allFiles.filter(file => {
    const name = file.name.toLowerCase();
    const isComponent =
      /^[A-Z]/.test(file.name) ||           // PascalCase
      name.includes('component') ||          // Has "component" in name
      name.includes('page') ||               // Page components
      name.includes('view') ||               // View components
      file.path.includes('components') ||    // In components dir
      file.path.includes('pages');           // In pages dir

    return isComponent;
  });
}

/**
 * Find files matching a pattern
 */
export async function findFilesByPattern(
  projectPath: string,
  pattern: RegExp,
  options: FileDiscoveryOptions = {}
): Promise<DiscoveredFile[]> {
  const allFiles = await discoverFiles(projectPath, options);

  return allFiles.filter(file =>
    pattern.test(file.path) || pattern.test(file.name)
  );
}

/**
 * Discover files and load their contents
 */
export async function discoverFilesWithContent(
  projectPath: string,
  options: FileDiscoveryOptions = {}
): Promise<DiscoveredFile[]> {
  return discoverFiles(projectPath, {
    ...options,
    includeContent: true,
  });
}

/**
 * Get a summary of discovered files
 */
export function summarizeDiscovery(files: DiscoveredFile[]): string {
  const byExtension = files.reduce((acc, file) => {
    acc[file.extension] = (acc[file.extension] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalSize = files.reduce((sum, file) => sum + file.sizeBytes, 0);

  let summary = `Found ${files.length} files:\n`;
  for (const [ext, count] of Object.entries(byExtension)) {
    summary += `  ${ext}: ${count} files\n`;
  }
  summary += `Total size: ${(totalSize / 1024).toFixed(2)} KB\n`;

  return summary;
}
