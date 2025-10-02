/**
 * Docling Service
 *
 * Interfaces with Docling Python library to parse documents (PDF, DOCX, PPTX, etc.)
 * into structured markdown with table extraction
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface DoclingResult {
  success: boolean;
  markdown: string | null;
  tables: Array<{
    data: string;
    num_rows: number | null;
    num_cols: number | null;
  }>;
  metadata: {
    num_pages: number | null;
    file_type: string;
    file_name: string;
  };
  error?: string;
}

export class DoclingService {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    // Path to Python venv
    const projectRoot = path.resolve(__dirname, '../../../..');
    this.pythonPath = path.join(projectRoot, '.venv-docling', 'bin', 'python3');
    this.scriptPath = path.join(__dirname, '../../python/docling_parser.py');

    // Verify paths exist
    if (!fs.existsSync(this.pythonPath)) {
      throw new Error(`Python executable not found at: ${this.pythonPath}`);
    }
    if (!fs.existsSync(this.scriptPath)) {
      throw new Error(`Docling script not found at: ${this.scriptPath}`);
    }
  }

  /**
   * Parse a document using Docling
   *
   * @param filePath - Absolute path to document file
   * @returns Promise<DoclingResult>
   */
  async parseDocument(filePath: string): Promise<DoclingResult> {
    return new Promise((resolve, reject) => {
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`File not found: ${filePath}`));
      }

      // Spawn Python process
      const python = spawn(this.pythonPath, [this.scriptPath, filePath]);

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`Docling parser failed: ${stderr}`));
        }

        try {
          const result = JSON.parse(stdout) as DoclingResult;
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Docling output: ${error}`));
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }

  /**
   * Parse a PRD file and extract structured information
   *
   * @param filePath - Path to PRD file (PDF, DOCX, MD, etc.)
   * @returns Parsed markdown content
   */
  async parsePRD(filePath: string): Promise<{
    markdown: string;
    tables: Array<{ data: string; num_rows: number | null; num_cols: number | null }>;
    metadata: { num_pages: number | null; file_type: string; file_name: string };
  }> {
    const result = await this.parseDocument(filePath);

    if (!result.success || !result.markdown) {
      throw new Error(result.error || 'Failed to parse PRD document');
    }

    return {
      markdown: result.markdown,
      tables: result.tables,
      metadata: result.metadata
    };
  }

  /**
   * Check if Docling is available and working
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if Python executable exists
      if (!fs.existsSync(this.pythonPath)) {
        console.error('Docling health check failed: Python executable not found');
        return false;
      }

      // Check if script exists
      if (!fs.existsSync(this.scriptPath)) {
        console.error('Docling health check failed: Parser script not found');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Docling health check failed:', error);
      return false;
    }
  }
}
